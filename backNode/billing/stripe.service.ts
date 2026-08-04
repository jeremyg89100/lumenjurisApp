import Stripe from 'stripe';
import { prisma } from "./../prisma/singletonPrisma.js"
import { Prisma, PlanName, PlanInterval, SubscriptionStatus, CreditTransactionType } from "@prisma/client"
import { Mailer } from "../src/infrastructure/mailer/classMailer.js"
import type { InvoiceData } from "../src/infrastructure/pdf/invoicePDF.js"
import {
    buildInvoiceNumber,
    buildCustomerInvoiceInfo,
    USER_INVOICE_SELECT,
} from "../src/services/classSubscription.js"

export class StripeLumenJuris {


    private stripeClient = new Stripe(process.env.STRIPE_SK!, {
        maxNetworkRetries: 2,
        telemetry: process.env.NODE_ENV == "dev" ? true : false
    })

    async createCustomer(email: string, name: string) {
        try {
            const params: Stripe.CustomerCreateParams = {
                description: 'test customer',
                email,
                name
            }

            const customer: Stripe.Customer = await this.stripeClient.customers.create(params)
            console.log(customer)
            const id = customer.id
            return {
                success: !!id,
                message: id ? "Le nouveau client a été créé dans stripe avec succès" : "Echec, le client stripe n'a pas pu être créé",
                customerId: id
            }
        } catch (err) {
            console.error(`Une erreur est survenue lors de la création d'un customer stripe, error : \n ${err}`)
            return {
                success: false,
                message: "Une erreur est survenue lors de la création d'un customer stripe"
            }
        }
    }


    async handleEvent(event: Stripe.Event) {
        try {

            console.log("Type de l'event Stripe :", event.type)

            switch (event.type) {
                case "checkout.session.completed":
                    //Création de la nouvelle subscription succès, première activation
                    //Commencer a mettre les credits
                    return this.onCheckoutCompleted(event)

                case "invoice.payment_succeeded":
                    //Chaque mois quand un paiment a lieux pour une subscription 
                    return this.onPaymentSucceeded(event)

                case "invoice.payment_failed":
                    //Le paiment d'une subscription a échoué
                    return this.onPaymentFailed(event)

                case "customer.subscription.created":
                    // Création abonnement à un plan
                    return this.onSubscriptionCreated(event)

                case "customer.subscription.updated":
                    //mise à jour d'un plan d'abonnement
                    return this.onSubscriptionUpdated(event)

                case "customer.subscription.deleted":
                    // Résiliation
                    return this.onSubscriptionDeleted(event)

                default:
                    console.error("Evenement Stripe non géré : ", event.type);
                    return {
                        success: true,
                        message: "Event ignoré"
                    }
            }

        } catch (err) {
            console.error(err)
            return {
                success: false
            }
        }
    }


    /**
     * Exécute le traitement métier d'un event Stripe de façon idempotente ET atomique.
     *
     * La marque `ProcessedStripeEvent` et tout le travail `work` sont dans UNE SEULE
     * transaction :
     *  - si `work` échoue -> rollback complet (la marque est annulée) -> Stripe rejouera ;
     *  - si l'event a déjà été traité -> la création de la marque lève P2002 (contrainte
     *    @unique) -> on l'ignore proprement sans retoucher la base.
     * Chaque handler (onCheckoutCompleted, onPaymentSucceeded...) passe par ici et reçoit
     * le client transactionnel `tx` à utiliser pour toutes ses écritures.
     */
    private async processOnce(
        event: Stripe.Event,
        work: (tx: Prisma.TransactionClient) => Promise<void>,
    ) {
        try {
            await prisma.$transaction(async (tx) => {
                await tx.processedStripeEvent.create({
                    data: { eventId: event.id, type: event.type },
                });
                await work(tx);
            });
            return { success: true };
        } catch (err) {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002"
            ) {
                console.log("Event Stripe déjà traité, doublon ignoré :", event.id);
                return { success: true, message: "Event déjà traité (doublon ignoré)" };
            }
            console.error("Echec du traitement de l'event Stripe :", event.id, err);
            return { success: false };
        }
    }


    /**
     * Extrait les quotas *à valeur finie et activée* d'un plan, sous forme
     * { feature -> montant accordé }. Ce sont les seuls qui génèrent une
     * CreditTransaction.
     *  - quota illimité (unlimited) -> ignoré (rien à décompter) ;
     *  - feature désactivée (enabled: false) -> ignorée ;
     *  - features booléennes (droits d'accès) -> jamais retournées.
     */
    private extractFiniteQuotas(
        creditsIncluded: Prisma.JsonValue,
    ): { feature: string; amount: number }[] {
        // Structure attendue (miroir de CreditPlan dans seedPlans.ts)
        type NumericQuota = { unlimited: true } | { unlimited: false; value: number };
        type MeteredQuota = { enabled: false } | { enabled: true; limit: number };
        const q = creditsIncluded as unknown as {
            analyzer?: NumericQuota;
            signatureEnhanced?: MeteredQuota;
            contrathequeLimit?: NumericQuota;
        };

        const result: { feature: string; amount: number }[] = [];

        if (q.analyzer && q.analyzer.unlimited === false) {
            result.push({ feature: "analyzer", amount: q.analyzer.value });
        }
        if (q.contrathequeLimit && q.contrathequeLimit.unlimited === false) {
            result.push({ feature: "contrathequeLimit", amount: q.contrathequeLimit.value });
        }
        if (q.signatureEnhanced && q.signatureEnhanced.enabled === true) {
            result.push({ feature: "signatureEnhanced", amount: q.signatureEnhanced.limit });
        }

        return result;
    }


    /** Traduit le statut Stripe vers enum prisma SubscriptionStatus. */
    private mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
        switch (status) {
            case "active":
            case "trialing":
            case "past_due": // Stripe retente encore -> on garde l'accès actif
                return SubscriptionStatus.ACTIVE;
            case "canceled":
                return SubscriptionStatus.CANCELLED;
            default:
                // incomplete, incomplete_expired, paused, unpaid...
                return SubscriptionStatus.PENDING;
        }
    }

    /**
     * Date de fin de période courante. Depuis l'API v2206, elle n'est plus à la
     * racine de la subscription mais portée par chaque item.
     */
    private readSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
        const periodEnd = subscription.items?.data?.[0]?.current_period_end;
        return typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null;
    }

    /** priceId Stripe courant de la subscription (1er item). Sert à retrouver le plan. */
    private readSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
        return subscription.items?.data?.[0]?.price?.id ?? null;
    }


    async createPayementIntent(customerId: string, amount: number, autmaticPayment: boolean) {
        try {

            const paymentIntent = await this.stripeClient.paymentIntents.create({
                amount: amount,
                currency: "eur",
                automatic_payment_methods: {
                    enabled: autmaticPayment
                },
                customer: customerId

            })

            console.log(paymentIntent)
            const id = paymentIntent.id
            return {
                success: !!id,
                clientSecret: paymentIntent.client_secret,
                message: id
                    ? "Le payment intent a été créé avec succès."
                    : "Le payment intent n'a pas pu être créé.",

            }
        } catch (err) {
            console.error(`Une erreur est survenue lors de la creation d'un payment intent, error : \n ${err}`)
            return {
                success: false,
                message: "Une erreur est survenue lors de la creation d'un payment intent"
            }
        }
    }




    // Stripe création d'une subscription qui se renouvelle
    async createCheckout(userId: number, planName: PlanName) {
        const successUrl = `${process.env.HOST_FRONT}/subscription/success`
        const cancelUrl = `${process.env.HOST_FRONT}/subscription/failed`


        const user = await prisma.user.findFirst({
            where: { idUser: userId },
            select: {
                email: true,
                nom: true,
                prenom: true,
                stripeCustomerId: true
            }
        })

        //recherche du plan dans la bdd
        const plan = await prisma.plan.findFirst({
            where: { name: planName },
            select: {
                stripeProductId: true,
                idPlan: true,
                name: true,
                price: true,
                stripePriceId: true
            }
        })

        //Retour si le plan n'a pas été retrouvé
        if (!plan) {
            return {
                success: false,
                message: "Le plan d'abonnement n'a pas pu être retrouvé",
                status: 404
            }
        }

        const customerId = user?.stripeCustomerId ?? (await this.createCustomer(user?.email!, user?.nom!)).customerId


        const checkout = await this.stripeClient.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1
                }
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: userId.toString(),
                planName,
                idPlan: plan.idPlan,
            }
        })

        const dataCheckout = {
            id: checkout.id,
            url: checkout.url,
            customer: checkout.customer,
            mode: checkout.mode,
            status: checkout.status,
            paymentStatus: checkout.payment_status
        }

        return {
            success: !!checkout,
            data: dataCheckout,
            url: dataCheckout.url
        }

    }







    //==HANDLE WEBHOOK STRIPE
    // Validation d'un premier achat via Stripe Checkout
    private async onCheckoutCompleted(event: Stripe.Event) {
        return this.processOnce(event, async (tx) => {
            const session = event.data.object as Stripe.Checkout.Session;

            if (!session.metadata) throw new Error("Metadata Stripe checkout.session absente.");

            // Récupérer les metadata posées lors de la création du checkout
            const userId = Number(session.metadata.userId);
            const idPlan = Number(session.metadata.idPlan);
            if (!Number.isInteger(userId) || !Number.isInteger(idPlan)) {
                throw new Error(
                    `Metadata checkout invalides : userId=${session.metadata.userId}, idPlan=${session.metadata.idPlan}`,
                );
            }

            // Dans le webhook, customer et subscription arrivent sous forme de string
            // (non "expanded"). On sécurise quand même le cas objet.
            const stripeCustomerId =
                typeof session.customer === "string"
                    ? session.customer
                    : session.customer?.id ?? null;
            const stripeSubscriptionId =
                typeof session.subscription === "string"
                    ? session.subscription
                    : session.subscription?.id ?? null;

            // Vérifier que l'utilisateur existe
            const user = await tx.user.findUnique({
                where: { idUser: userId },
                select: { idUser: true },
            });
            if (!user) {
                throw new Error(`Utilisateur introuvable pour le checkout (userId=${userId})`);
            }

            // Récupérer le plan acheté (intervalle pour les dates, stripePriceId à stocker)
            const plan = await tx.plan.findUnique({
                where: { idPlan },
                select: { idPlan: true, interval: true, stripePriceId: true },
            });
            if (!plan) {
                throw new Error(`Plan introuvable pour le checkout (idPlan=${idPlan})`);
            }

            // Enregistrer le Stripe Customer ID sur l'utilisateur (réutilisé aux prochains achats)
            if (stripeCustomerId) {
                await tx.user.update({
                    where: { idUser: userId },
                    data: { stripeCustomerId },
                });
            }

            // Dates de période provisoires, calculées depuis l'intervalle du plan.
            // Les dates authentiques (current_period_end de Stripe) seront resynchronisées
            // par customer.subscription.created / updated.
            const now = new Date();
            const expiresAt =
                plan.interval === PlanInterval.yearly
                    ? new Date(new Date(now).setFullYear(now.getFullYear() + 1))
                    : new Date(new Date(now).setMonth(now.getMonth() + 1));


            // Créer/associer l'abonnement + stocker les IDs Stripe. Ces IDs sont la clé
            // de correspondance pour les events suivants (invoice.payment_succeeded,
            // customer.subscription.*) qui, eux, n'ont pas nos metadata.
            // NB : les quotas ne sont PAS attribués ici -> c'est invoice.payment_succeeded.
            await tx.subscription.upsert({
                where: { userId },
                create: {
                    userId,
                    planId: plan.idPlan,
                    status: SubscriptionStatus.ACTIVE,
                    startAt: now,
                    expiresAt,
                    stripeSubscriptionId,
                    stripePriceId: plan.stripePriceId,
                },
                update: {
                    planId: plan.idPlan,
                    status: SubscriptionStatus.ACTIVE,
                    startAt: now,
                    expiresAt,
                    stripeSubscriptionId,
                    stripePriceId: plan.stripePriceId,
                },
            });

            console.log(
                `Checkout complété : abonnement activé pour userId=${userId}, idPlan=${idPlan}`,
            );
        });
    }


    // Paiement d'une facture Stripe (premier paiement + renouvellements)
    private async onPaymentSucceeded(event: Stripe.Event) {
        // Rempli DANS la transaction, envoyé APRES le commit (l'email est un effet
        // externe non annulable). Reste undefined si l'event est un doublon ou une
        // facture hors abonnement -> aucun email envoyé.
        let invoiceEmail:
            | {
                email: string;
                prenom: string | null;
                data: InvoiceData;
            }
            | undefined;

        const result = await this.processOnce(event, async (tx) => {
            const invoice = event.data.object as Stripe.Invoice;

            // Depuis l'API v2206, l'ID de la subscription n'est plus à la racine de
            // l'invoice mais sous parent.subscription_details.subscription.
            const subscriptionDetails = invoice.parent?.subscription_details;
            const stripeSubscriptionId = subscriptionDetails
                ? typeof subscriptionDetails.subscription === "string"
                    ? subscriptionDetails.subscription
                    : subscriptionDetails.subscription?.id ?? null
                : null;

            // Facture hors abonnement (paiement ponctuel) -> rien à créditer ici
            if (!stripeSubscriptionId) {
                console.log("invoice.payment_succeeded sans subscription, ignoré :", invoice.id);
                return;
            }

            // Retrouver NOTRE abonnement via l'ID Stripe (persisté par onCheckoutCompleted)
            const subscription = await tx.subscription.findFirst({
                where: { stripeSubscriptionId },
                include: { plan: true },
            });
            if (!subscription) {
                throw new Error(
                    `Abonnement introuvable pour stripeSubscriptionId=${stripeSubscriptionId}`,
                );
            }

            const userId = subscription.userId;
            const plan = subscription.plan;

            // Réinitialiser les quotas de la période : copie fraîche du plan.
            // Vaut pour le premier paiement ET les renouvellements (mêmes règles).
            await tx.userCredit.upsert({
                where: { userId },
                create: {
                    userId,
                    quotas: plan.creditsIncluded as Prisma.InputJsonValue,
                },
                update: {
                    quotas: plan.creditsIncluded as Prisma.InputJsonValue,
                },
            });

            // Journaliser l'attribution, une ligne par quota à valeur finie.
            // Les features booléennes et les quotas illimités ne sont pas journalisés.
            const finiteQuotas = this.extractFiniteQuotas(plan.creditsIncluded);
            for (const { feature, amount } of finiteQuotas) {
                await tx.creditTransaction.create({
                    data: {
                        userId,
                        feature,
                        amount, // + montant accordé
                        balanceAfter: amount, // après reset, le restant = le montant plein
                        type: CreditTransactionType.SUBSCRIPTION,
                        description: `Attribution quota ${feature} (plan ${plan.name})`,
                        sourceId: event.id,
                    },
                });
            }

            // Mettre à jour la prochaine échéance depuis l'intervalle du plan
            // (les dates authentiques Stripe sont synchronisées par subscription.updated).
            const now = new Date();
            const expiresAt =
                plan.interval === PlanInterval.yearly
                    ? new Date(new Date(now).setFullYear(now.getFullYear() + 1))
                    : new Date(new Date(now).setMonth(now.getMonth() + 1));

            await tx.subscription.update({
                where: { idSubscription: subscription.idSubscription },
                data: { status: SubscriptionStatus.ACTIVE, expiresAt },
            });

            // Créer la Facture (source de vérité = Stripe). Couvre le premier
            // paiement et les renouvellements.
            const amountPaidCents = invoice.amount_paid ?? 0;
            const facture = await tx.facture.create({
                data: {
                    subscriptionId: subscription.idSubscription,
                    price: amountPaidCents,
                    stripeInvoiceId: invoice.id ?? `stripe_${event.id}`,
                    status: "PAID",
                },
            });

            // Préparer les données de l'email de facture (envoyé après le commit)
            const user = await tx.user.findUnique({
                where: { idUser: userId },
                select: USER_INVOICE_SELECT,
            });
            if (user) {
                invoiceEmail = {
                    email: user.email,
                    prenom: user.prenom,
                    data: {
                        invoiceNumber: buildInvoiceNumber(facture.idFacture, facture.createdAt),
                        date: facture.createdAt,
                        ...buildCustomerInvoiceInfo(user),
                        planName: plan.name,
                        interval: plan.interval,
                        amountTTCCents: amountPaidCents,
                        stripePaymentIntentId: facture.stripeInvoiceId,
                    },
                };
            }

            console.log(
                `Paiement réussi : quotas réinitialisés pour userId=${userId}, plan=${plan.name}`,
            );
        });

        // Effet externe non annulable : hors transaction, uniquement si le travail a
        // réellement tourné (pas un doublon) et si l'utilisateur a été trouvé.
        if (result.success && invoiceEmail) {
            new Mailer(invoiceEmail.email)
                .sendInvoice(invoiceEmail.data, invoiceEmail.prenom ?? undefined)
                .catch((error) =>
                    console.error(
                        "Erreur lors de l'envoi de la facture par email (webhook):",
                        error,
                    ),
                );
        }

        return result;
    }


    // Création d'une subscription : synchronise statut + dates de période réelles.
    private async onSubscriptionCreated(event: Stripe.Event) {
        return this.processOnce(event, async (tx) => {
            const subscription = event.data.object as Stripe.Subscription;

            // On retrouve NOTRE abonnement via l'ID Stripe (posé par onCheckoutCompleted).
            // Si l'ordre des events fait que checkout.completed n'a pas encore tourné,
            // on ne fait rien : la synchro se fera via onSubscriptionUpdated / paiement.
            const local = await tx.subscription.findFirst({
                where: { stripeSubscriptionId: subscription.id },
                select: { idSubscription: true },
            });
            if (!local) {
                console.log(
                    "subscription.created : abonnement local pas encore créé, ignoré :",
                    subscription.id,
                );
                return;
            }

            const expiresAt = this.readSubscriptionPeriodEnd(subscription);
            await tx.subscription.update({
                where: { idSubscription: local.idSubscription },
                data: {
                    status: this.mapStripeSubscriptionStatus(subscription.status),
                    ...(expiresAt ? { expiresAt } : {}),
                },
            });

            console.log("subscription.created synchronisée :", subscription.id);
        });
    }


    // Modification d'une subscription : changement de plan, période, annulation différée.
    private async onSubscriptionUpdated(event: Stripe.Event) {
        return this.processOnce(event, async (tx) => {
            const subscription = event.data.object as Stripe.Subscription;

            const local = await tx.subscription.findFirst({
                where: { stripeSubscriptionId: subscription.id },
                select: { idSubscription: true },
            });
            if (!local) {
                console.log(
                    "subscription.updated : abonnement local introuvable, ignoré :",
                    subscription.id,
                );
                return;
            }

            // Si le priceId courant a changé, on retrouve le plan correspondant pour
            // resynchroniser le lien. (Les quotas, eux, sont réattribués au paiement.)
            const stripePriceId = this.readSubscriptionPriceId(subscription);
            let planId: number | undefined;
            if (stripePriceId) {
                const plan = await tx.plan.findFirst({
                    where: { stripePriceId },
                    select: { idPlan: true },
                });
                if (plan) {
                    planId = plan.idPlan;
                } else {
                    console.warn(
                        "subscription.updated : aucun plan local pour le priceId",
                        stripePriceId,
                    );
                }
            }

            const expiresAt = this.readSubscriptionPeriodEnd(subscription);
            await tx.subscription.update({
                where: { idSubscription: local.idSubscription },
                data: {
                    status: this.mapStripeSubscriptionStatus(subscription.status),
                    ...(planId ? { planId } : {}),
                    ...(stripePriceId ? { stripePriceId } : {}),
                    ...(expiresAt ? { expiresAt } : {}),
                },
            });

            console.log(
                `subscription.updated synchronisée : ${subscription.id} (annulation différée: ${subscription.cancel_at_period_end})`,
            );
        });
    }


    // Suppression d'une subscription : retour au plan Freemium.
    private async onSubscriptionDeleted(event: Stripe.Event) {
        return this.processOnce(event, async (tx) => {
            const subscription = event.data.object as Stripe.Subscription;

            const local = await tx.subscription.findFirst({
                where: { stripeSubscriptionId: subscription.id },
                select: { idSubscription: true, userId: true },
            });
            if (!local) {
                console.log(
                    "subscription.deleted : abonnement local introuvable, ignoré :",
                    subscription.id,
                );
                return;
            }

            // Plan Freemium = état de repli après résiliation.
            const freemium = await tx.plan.findFirst({
                where: { name: PlanName.Freemium, interval: PlanInterval.monthly },
                select: { idPlan: true, creditsIncluded: true },
            });
            if (!freemium) {
                throw new Error("Plan Freemium introuvable en BDD (résiliation).");
            }

            const now = new Date();
            const expiresAt = new Date(new Date(now).setMonth(now.getMonth() + 1));

            // Basculer l'abonnement sur Freemium et couper le lien Stripe payant.
            await tx.subscription.update({
                where: { idSubscription: local.idSubscription },
                data: {
                    planId: freemium.idPlan,
                    status: SubscriptionStatus.ACTIVE,
                    startAt: now,
                    expiresAt,
                    stripeSubscriptionId: null,
                    stripePriceId: null,
                },
            });

            // Réinitialiser les quotas sur ceux du Freemium.
            await tx.userCredit.upsert({
                where: { userId: local.userId },
                create: {
                    userId: local.userId,
                    quotas: freemium.creditsIncluded as Prisma.InputJsonValue,
                },
                update: {
                    quotas: freemium.creditsIncluded as Prisma.InputJsonValue,
                },
            });

            console.log(
                `subscription.deleted : userId=${local.userId} repassé en Freemium.`,
            );
        });
    }


    // Paiement refusé : on trace l'échec mais on NE rétrograde PAS.
    // Stripe retente automatiquement les jours suivants ; c'est
    // customer.subscription.deleted qui déclenchera le retour au Freemium.
    private async onPaymentFailed(event: Stripe.Event) {
        return this.processOnce(event, async (tx) => {
            const invoice = event.data.object as Stripe.Invoice;

            const subscriptionDetails = invoice.parent?.subscription_details;
            const stripeSubscriptionId = subscriptionDetails
                ? typeof subscriptionDetails.subscription === "string"
                    ? subscriptionDetails.subscription
                    : subscriptionDetails.subscription?.id ?? null
                : null;

            // Échec hors abonnement -> rien à tracer côté abonnement
            if (!stripeSubscriptionId) {
                console.log("invoice.payment_failed sans subscription, ignoré :", invoice.id);
                return;
            }

            const subscription = await tx.subscription.findFirst({
                where: { stripeSubscriptionId },
                select: { idSubscription: true, userId: true },
            });
            if (!subscription) {
                console.log(
                    "invoice.payment_failed : abonnement local introuvable, ignoré :",
                    stripeSubscriptionId,
                );
                return;
            }

            // Tracer la tentative échouée (montant dû, non encaissé).
            const amountDueCents = invoice.amount_due ?? 0;
            await tx.facture.create({
                data: {
                    subscriptionId: subscription.idSubscription,
                    price: amountDueCents,
                    stripeInvoiceId: invoice.id ?? `stripe_${event.id}`,
                    status: "FAILED",
                },
            });

            // TODO (à venir) : envoyer un email d'information à l'utilisateur
            // (nécessite un nouveau template Mailer, ex: sendPaymentFailed). Effet
            // externe -> à déclencher APRÈS le commit, comme sendInvoice.

            console.log(
                `invoice.payment_failed tracée pour userId=${subscription.userId} (pas de rétrogradation).`,
            );
        });
    }


}
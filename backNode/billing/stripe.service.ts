import Stripe from 'stripe';
import { prisma } from "./singletonPrisma.js"


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
    async createCheckout(userId: number, planName: string) {
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
    //Validation d'un achat via le webhook stripe, on peux valider l'achat de l'abonnement et mettre les credits
    private async onCheckoutCompleted(event: Stripe.Event) {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.metadata) throw new Error("Metada Stripe checkout.session absente.")
        const metadata = session.metadata
    }

    private async onPaymentSucceeded(event: Stripe.Event) {
        // Renouvellement + crédits

    }

    private async onSubscriptionCreated(event: Stripe.Event) {

    }

    private async onSubscriptionUpdated(event: Stripe.Event) {

    }

    //Arrêt d'une subscription abonnement
    private async onSubscriptionDeleted(event: Stripe.Event) {

    }

    //Echec d'un payment sur la page relayé par stripe
    private async onPaymentFailed(event: Stripe.Event) {
        //REmettre plan freemium
        //Contacter l'utilisateur, email
    }


}
import { prisma } from "../../prisma/singletonPrisma.js";
import { Prisma, SubscriptionStatus, CreditTransactionType } from "@prisma/client";

type ReturnData<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
};

// ─── Modèle des quotas ───────────────────────────────────────────────────────
// UserCredit.quotas est une copie de Plan.creditsIncluded (structure CreditPlan
// de seedPlans.ts). Deux natures d'entrées :
//  - quotas À VALEUR (consommables)  : analyzer, contrathequeLimit ({unlimited,value})
//                                      et signatureEnhanced ({enabled,limit}) ;
//  - features BOOLÉENNES (droits d'accès) : le reste ({enabled}) — non consommables.

/** Les 3 seules features consommables (à valeur). Les autres sont des droits d'accès. */
const CONSUMABLE_FEATURES = ["analyzer", "contrathequeLimit", "signatureEnhanced"] as const;
type ConsumableFeature = (typeof CONSUMABLE_FEATURES)[number];

/** État d'un quota consommable pour un utilisateur. */
type FeatureState =
  | { kind: "unlimited" } // illimité : rien à décompter
  | { kind: "disabled" } // feature absente / désactivée dans le plan
  | { kind: "finite"; remaining: number }; // quota à valeur, `remaining` restant

function isConsumable(feature: string): feature is ConsumableFeature {
  return (CONSUMABLE_FEATURES as readonly string[]).includes(feature);
}

/** Lit l'état d'un quota consommable dans le JSON quotas. */
function readRemaining(quotas: Prisma.JsonValue, feature: ConsumableFeature): FeatureState {
  const all = quotas as Record<string, any> | null;
  const q = all?.[feature];
  if (!q) return { kind: "disabled" };

  // analyzer / contrathequeLimit : { unlimited: boolean, value?: number }
  if (feature === "analyzer" || feature === "contrathequeLimit") {
    if (q.unlimited === true) return { kind: "unlimited" };
    if (q.unlimited === false && typeof q.value === "number") {
      return { kind: "finite", remaining: q.value };
    }
    return { kind: "disabled" };
  }

  // signatureEnhanced : { enabled: boolean, limit?: number }
  if (q.enabled === true && typeof q.limit === "number") {
    return { kind: "finite", remaining: q.limit };
  }
  return { kind: "disabled" };
}

/** Renvoie une copie du JSON quotas avec le restant d'une feature mis à jour. */
function writeRemaining(
  quotas: Prisma.JsonValue,
  feature: ConsumableFeature,
  remaining: number,
): Prisma.InputJsonValue {
  const next = structuredClone(quotas) as Record<string, any>;
  if (feature === "analyzer" || feature === "contrathequeLimit") {
    next[feature] = { unlimited: false, value: remaining };
  } else {
    next[feature] = { enabled: true, limit: remaining };
  }
  return next as Prisma.InputJsonValue;
}

export class Credit {
  /**
   * Ajoute un bonus à un quota consommable (ex: offrir 10 analyses).
   * Ne fonctionne que sur une feature à valeur déjà active dans le plan.
   */
  async addQuota(
    userId: number,
    feature: string,
    amount: number,
  ): Promise<ReturnData> {
    try {
      if (!isConsumable(feature)) {
        return { success: false, message: `Feature "${feature}" non consommable.` };
      }

      const activeSubscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { status: true },
      });
      if (!activeSubscription || activeSubscription.status !== SubscriptionStatus.ACTIVE) {
        return { success: false, message: "Aucun abonnement actif !" };
      }

      const userCredit = await prisma.userCredit.findUnique({ where: { userId } });
      if (!userCredit) return { success: false, message: "Aucun quota pour cet utilisateur." };

      const state = readRemaining(userCredit.quotas, feature);
      if (state.kind === "unlimited") {
        return { success: true, message: "Quota illimité, aucun bonus nécessaire." };
      }
      if (state.kind === "disabled") {
        return { success: false, message: `Feature "${feature}" non incluse dans le plan.` };
      }

      const newRemaining = state.remaining + amount;
      const newQuotas = writeRemaining(userCredit.quotas, feature, newRemaining);

      await prisma.$transaction([
        prisma.userCredit.update({ where: { userId }, data: { quotas: newQuotas } }),
        prisma.creditTransaction.create({
          data: {
            userId,
            feature,
            amount, // + bonus
            balanceAfter: newRemaining,
            type: CreditTransactionType.BONUS,
            description: `Bonus quota ${feature}`,
          },
        }),
      ]);

      return {
        success: true,
        message: "Bonus ajouté.",
        data: { feature, remaining: newRemaining },
      };
    } catch (error) {
      console.error("ADD QUOTA ERROR:", error);
      return { success: false, message: "Erreur lors de l'ajout du quota." };
    }
  }

  /**
   * Consomme `amount` unités d'un quota (ex: 1 analyse). Respecte l'illimité
   * (aucun décompte) et refuse si la feature est absente ou le quota épuisé.
   */
  async consumeQuota(
    userId: number,
    feature: string,
    amount = 1,
  ): Promise<ReturnData> {
    try {
      if (!isConsumable(feature)) {
        return { success: false, message: `Feature "${feature}" non consommable.` };
      }

      const activeSubscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { status: true },
      });
      if (!activeSubscription || activeSubscription.status !== SubscriptionStatus.ACTIVE) {
        return { success: false, message: "Aucun abonnement actif !" };
      }

      const userCredit = await prisma.userCredit.findUnique({ where: { userId } });
      if (!userCredit) return { success: false, message: "Aucun quota pour cet utilisateur." };

      const state = readRemaining(userCredit.quotas, feature);
      if (state.kind === "unlimited") {
        return { success: true, message: "Quota illimité.", data: { unlimited: true } };
      }
      if (state.kind === "disabled") {
        return { success: false, message: `Feature "${feature}" non incluse dans le plan.` };
      }
      if (state.remaining < amount) {
        return {
          success: false,
          message: "Quota épuisé.",
          data: { feature, remaining: state.remaining },
        };
      }

      const newRemaining = state.remaining - amount;
      const newQuotas = writeRemaining(userCredit.quotas, feature, newRemaining);

      await prisma.$transaction([
        prisma.userCredit.update({ where: { userId }, data: { quotas: newQuotas } }),
        prisma.creditTransaction.create({
          data: {
            userId,
            feature,
            amount: -amount, // - consommation
            balanceAfter: newRemaining,
            type: CreditTransactionType.CONSUMPTION,
            description: `Consommation quota ${feature}`,
          },
        }),
      ]);

      return {
        success: true,
        message: "Quota consommé.",
        data: { feature, remaining: newRemaining },
      };
    } catch (error) {
      console.error("CONSUME QUOTA ERROR:", error);
      return { success: false, message: "Erreur lors de la consommation du quota." };
    }
  }

  /** Renvoie les quotas restants de l'utilisateur (structure JSON par feature). */
  async getUserCredits(userId: number): Promise<ReturnData> {
    try {
      const user = await prisma.user.findUnique({ where: { idUser: userId } });
      if (!user) return { success: false, message: "Utilisateur introuvable !" };

      const userCredit = await prisma.userCredit.findUnique({
        where: { userId },
        select: { quotas: true },
      });

      return {
        success: true,
        message: "Quotas restants.",
        data: userCredit ? { quotas: userCredit.quotas } : { quotas: null },
      };
    } catch (error) {
      console.error("GET QUOTA ERROR:", error);
      return { success: false, message: "Erreur lors de la récupération de vos quotas." };
    }
  }
}

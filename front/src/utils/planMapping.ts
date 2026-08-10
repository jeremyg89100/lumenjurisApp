import type { BillingInterval } from "../types/subscriptionData";

/**
 * Clé sessionStorage où l'on mémorise le plan choisi par un visiteur NON connecté,
 * le temps qu'il s'inscrive. Au retour authentifié, `PlansPanel` relit cette clé
 * et relance le checkout. On passe par sessionStorage (et non le state du routeur)
 * car ce dernier ne survit pas à la redirection d'inscription.
 * Valeur stockée : JSON `{ name: string, interval: BillingInterval }`.
 */
export const PENDING_CHECKOUT_KEY = "pendingCheckoutPlan";

/**
 * Noms de plans côté backend (miroir de l'enum Prisma `PlanName`).
 * C'est cette valeur qu'attend `POST /billing/create-checkout`.
 */
export type PlanName =
  | "Freemium"
  | "Betatesteur"
  | "Starter_mensuel"
  | "Starter_annuel"
  | "Pro_mensuel"
  | "Pro_annuel";

/**
 * Traduit une offre affichée dans la grille de prix (PlansPanel : "Starter",
 * "Pro"...) + une périodicité vers le `PlanName` attendu par le backend.
 *
 * Renvoie `null` pour les offres qui ne passent PAS par Stripe Checkout :
 *  - "Free" (Freemium) → inscription directe, sans paiement ;
 *  - "Enterprise" → sur devis (contact).
 *
 * @example
 * toCheckoutPlanName("Starter", "yearly") // "Starter_annuel"
 * toCheckoutPlanName("Pro", "monthly")    // "Pro_mensuel"
 * toCheckoutPlanName("Free", "monthly")   // null
 */
export function toCheckoutPlanName(
  uiName: string,
  interval: BillingInterval,
): PlanName | null {
  const suffix = interval === "yearly" ? "annuel" : "mensuel";
  switch (uiName) {
    case "Starter":
      return `Starter_${suffix}` as PlanName;
    case "Pro":
      return `Pro_${suffix}` as PlanName;
    default:
      // Free (Freemium) et Enterprise (sur devis) ne passent pas par Checkout.
      return null;
  }
}

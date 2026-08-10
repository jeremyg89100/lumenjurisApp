import type { PlanQuotas } from "./quotas";

/**
 * Crédits renvoyés par GET /api/billing/subscription (champ `credits`).
 * `quotas` = quotas restants de l'utilisateur ; `planQuotas` = quotas pleins
 * du plan (référence pour calculer la consommation).
 */
export type CreditsData = {
  quotas: PlanQuotas;
  planQuotas: PlanQuotas;
};

/** Corps attendu par PUT /api/billing/add-credits (bonus sur une feature ciblée). */
export type CreditsPayload = {
  feature: string;
  amount: number;
};

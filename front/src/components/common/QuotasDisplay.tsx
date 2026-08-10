import { CheckCircle2, XCircle } from "lucide-react";
import { CreditBar } from "./CreditBar";
import {
  BOOLEAN_FEATURES,
  NUMERIC_FEATURES,
  readQuotaValue,
  type PlanQuotas,
} from "../../types/quotas";

/**
 * Affiche les quotas d'un utilisateur par feature :
 *  - features à valeur : jauge (restant / plein), "Illimité" ou "Non inclus" ;
 *  - features booléennes : simple pastille Inclus / Non inclus.
 *
 * @param quotas     Quotas restants de l'utilisateur.
 * @param planQuotas Quotas pleins du plan (référence pour la jauge).
 */
export function QuotasDisplay({
  quotas,
  planQuotas,
}: {
  quotas: PlanQuotas;
  planQuotas: PlanQuotas;
}) {
  return (
    <div className="space-y-4">
      {/* Features à valeur */}
      <div className="space-y-3">
        {NUMERIC_FEATURES.map(({ key, label }) => {
          const full = readQuotaValue(planQuotas?.[key] as never);
          const remaining = readQuotaValue(quotas?.[key] as never);

          // Non incluse dans le plan
          if (full.kind === "disabled") {
            return (
              <div
                key={key}
                className="flex items-center justify-between text-xs text-gray-400"
              >
                <span className="font-medium">{label}</span>
                <span>Non inclus</span>
              </div>
            );
          }

          // Illimité
          if (full.kind === "unlimited") {
            return (
              <div
                key={key}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-medium text-gray-700">{label}</span>
                <span className="font-semibold text-lumenjuris">Illimité</span>
              </div>
            );
          }

          // Quota fini : jauge restant / plein
          const remainingValue =
            remaining.kind === "finite" ? remaining.value : 0;
          return (
            <CreditBar
              key={key}
              label={label}
              used={full.value - remainingValue}
              total={full.value}
            />
          );
        })}
      </div>

      {/* Features booléennes (droits d'accès) */}
      <div className="flex flex-wrap gap-2">
        {BOOLEAN_FEATURES.map(({ key, label }) => {
          const feature = planQuotas?.[key] as { enabled: boolean } | undefined;
          const enabled = feature?.enabled === true;
          return (
            <span
              key={key}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                enabled
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {enabled ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

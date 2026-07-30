import { useEffect, useState, useCallback } from "react";
import {
  Landmark,
  Receipt,
  Cpu,
  Wallet,
  FileArchive,
  FileSpreadsheet,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fetchProxy } from "../../utils/fetchProxy";

// ─── Types (miroir de la réponse de GET /api/admin/fiscalite) ────────────────

// Tous les montants sont déjà en EUROS (nombres décimaux), calculés côté serveur.
type MonthRow = {
  month: number; // 1 = janvier … 12 = décembre
  label: string;
  ventesHt: number;
  ventesTva: number; // TVA collectée sur les ventes
  ventesTtc: number;
  facturesCount: number;
  llmCostUsd: number;
  llmCostEur: number;
  llmTvaEur: number; // TVA autoliquidée sur les LLM (neutre à payer)
};

type FiscaliteTotals = {
  ventesHt: number;
  ventesTva: number;
  ventesTtc: number;
  facturesCount: number;
  llmCostUsd: number;
  llmCostEur: number;
  llmTvaEur: number;
};

type FiscaliteData = {
  year: number;
  usdToEurRate: number;
  tvaRate: number; // ex. 0.2
  months: MonthRow[];
  totals: FiscaliteTotals;
};

// ─── Formatage ───────────────────────────────────────────────────────────────

const euro = (amount: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);

const dollar = (amount: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);

// ─── Petite carte de synthèse ────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-4" title={hint}>
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1">
          {label}
          {hint && <Info className="w-3.5 h-3.5 text-gray-300 shrink-0 cursor-help" />}
        </p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 tabular-nums truncate">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

// ─── Section principale ──────────────────────────────────────────────────────

export function FiscaliteSection() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<FiscaliteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mois en cours de téléchargement (pour désactiver le bon bouton).
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchProxy(`/api/admin/fiscalite?year=${targetYear}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? `HTTP ${res.status}`);
      setData(json.data as FiscaliteData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [year, load]);

  /**
   * Télécharge un fichier (ZIP ou CSV) pour un mois donné. `kind` sert à la fois
   * à choisir l'endpoint et à identifier le bouton en cours de téléchargement.
   */
  const downloadMonthFile = async (month: number, kind: "zip" | "csv") => {
    const endpoint =
      kind === "zip"
        ? `/api/admin/fiscalite/factures-zip?year=${year}&month=${month}`
        : `/api/admin/fiscalite/factures-csv?year=${year}&month=${month}`;

    setDownloading(`${month}-${kind}`);
    try {
      const res = await fetchProxy(endpoint, { method: "GET", credentials: "include" });
      if (!res.ok) {
        // 404 = aucune facture ce mois-là ; on prévient sans casser la page.
        if (res.status === 404) {
          alert("Aucune facture à télécharger pour ce mois.");
        } else {
          alert("Le téléchargement a échoué.");
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = kind === "zip" ? `factures_${month}_${year}.zip` : `ventes_${month}_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Le téléchargement a échoué.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        Erreur : {error}
      </div>
    );
  }

  if (!data) return null;

  const { totals } = data;
  // TVA à décaisser : la TVA collectée sur les ventes. La TVA autoliquidée des
  // LLM est neutre (collectée = déductible), elle n'entre donc pas ici.
  const tvaADecaisser = totals.ventesTva;
  const tvaRatePct = Math.round(data.tvaRate * 100);

  return (
    <div className="space-y-8">

      {/* ── Sélecteur d'année ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          aria-label="Année précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-lg font-bold text-gray-900 tabular-nums w-16 text-center">{year}</span>
        <button
          onClick={() => setYear((y) => Math.min(y + 1, currentYear))}
          disabled={year >= currentYear}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Année suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Cartes de synthèse annuelle ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Receipt}
          label="TVA collectée"
          value={euro(totals.ventesTva)}
          sub={`sur ${euro(totals.ventesTtc)} TTC de ventes`}
          color="bg-emerald-50 text-emerald-600"
          hint={`TVA ${tvaRatePct} % encaissée sur les abonnements payés en ${year}.`}
        />
        <SummaryCard
          icon={Wallet}
          label="TVA à décaisser"
          value={euro(tvaADecaisser)}
          sub="à reverser au Trésor"
          color="bg-indigo-50 text-indigo-600"
          hint="TVA collectée sur les ventes. La TVA autoliquidée des LLM est neutre (à la fois collectée et déductible) et n'est donc pas comptée ici."
        />
        <SummaryCard
          icon={Landmark}
          label="CA HT annuel"
          value={euro(totals.ventesHt)}
          sub={`${totals.facturesCount} facture${totals.facturesCount > 1 ? "s" : ""}`}
          color="bg-sky-50 text-sky-600"
          hint="Chiffre d'affaires hors taxes cumulé sur l'année (utile pour le suivi des seuils de TVA)."
        />
        <SummaryCard
          icon={Cpu}
          label="TVA LLM (autoliquidée)"
          value={euro(totals.llmTvaEur)}
          sub="neutre à payer"
          color="bg-amber-50 text-amber-600"
          hint={`TVA ${tvaRatePct} % notionnelle sur ${euro(totals.llmCostEur)} de coûts LLM (${dollar(totals.llmCostUsd)}). Autoliquidation : collectée et déductible s'annulent.`}
        />
      </div>

      {/* ── Note sur la conversion de devise et l'autoliquidation ── */}
      <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <p>
          Les coûts LLM sont enregistrés en dollars et convertis en euros au taux fixe{" "}
          <span className="font-semibold text-gray-700">1&nbsp;$&nbsp;=&nbsp;{data.usdToEurRate.toFixed(4)}&nbsp;€</span>{" "}
          (valeur indicative). La « TVA LLM » relève de l'<span className="font-medium">autoliquidation</span> :
          elle est déclarée mais neutre à payer.
        </p>
      </div>

      {/* ── Tableau mensuel ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">
          Détail par mois{" "}
          <span className="font-normal text-gray-400 text-sm">— année {year}</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Mois</th>
                  <th className="text-right px-4 py-2.5">Factures</th>
                  <th className="text-right px-4 py-2.5">Ventes HT</th>
                  <th className="text-right px-4 py-2.5">TVA collectée</th>
                  <th className="text-right px-4 py-2.5">Ventes TTC</th>
                  <th className="text-right px-4 py-2.5">Coût LLM</th>
                  <th className="text-right px-4 py-2.5">TVA LLM</th>
                  <th className="text-right px-4 py-2.5">Factures du mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.months.map((row) => {
                  const hasSales = row.facturesCount > 0;
                  return (
                    <tr key={row.month} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{row.facturesCount || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{hasSales ? euro(row.ventesHt) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">{hasSales ? euro(row.ventesTva) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{hasSales ? euro(row.ventesTtc) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">{row.llmCostEur > 0 ? euro(row.llmCostEur) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600">{row.llmTvaEur > 0 ? euro(row.llmTvaEur) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => downloadMonthFile(row.month, "zip")}
                            disabled={!hasSales || downloading === `${row.month}-zip`}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Télécharger toutes les factures PDF du mois (ZIP)"
                          >
                            <FileArchive className="w-3.5 h-3.5" />
                            ZIP
                          </button>
                          <button
                            onClick={() => downloadMonthFile(row.month, "csv")}
                            disabled={!hasSales || downloading === `${row.month}-csv`}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Exporter le journal des ventes du mois (CSV comptable)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            CSV
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-800">
                  <td className="px-4 py-3">Total {year}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.facturesCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{euro(totals.ventesHt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{euro(totals.ventesTva)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{euro(totals.ventesTtc)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-500">{euro(totals.llmCostEur)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600">{euro(totals.llmTvaEur)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

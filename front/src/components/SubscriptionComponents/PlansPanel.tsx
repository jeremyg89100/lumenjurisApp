import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../utils/shadcnUtils/cn";

import { useUserStore } from "../../store/userStore";
import { BillingStripePanel } from "./BillingStripePanel";
import type { BillingInterval } from "../../types/subscriptionData";


type Plan = {
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  highlight?: boolean;
  badge?: string;
  features: string[];
  cta: string;
  /** Offre gratuite : inscription directe, sans paiement. */
  free?: boolean;
  /** Offre sur devis : déclenche un contact au lieu d'un paiement. */
  contactOnly?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    tagline: "Indépendants & TPE",
    monthly: 0,
    yearly: 0,
    free: true,
    cta: "Commencer gratuitement",
    features: [
      "Génération de contrats illimitée (export avec filigrane)",
      "Signature électronique simple illimitée",
      "3 analyses de contrat par IA / mois",
      "Négociation collaborative incluse",
      "Actualité juridique incluse",
      "Contrathèque : 5 contrats suivis",
    ],
  },
  {
    name: "Starter",
    tagline: "PME sans direction juridique",
    monthly: 49,
    yearly: 39,
    cta: "Choisir Starter",
    features: [
      "Tout le Free, plus :",
      "Export des contrats sans filigrane",
      "30 analyses de contrat par IA / mois",
      "Contrats et modèles illimités",
      "Suivi des échéances illimité + alertes (préavis, loi Chatel)",
      "Tableau de bord des renouvellements",
    ],
  },
  {
    name: "Pro",
    tagline: "PME structurée & ETI",
    monthly: 119,
    yearly: 99,
    highlight: true,
    badge: "Le plus populaire",
    cta: "Choisir Pro",
    features: [
      "Tout le Starter, plus :",
      "Analyses de contrat par IA illimitées",
      "Jurisprudence reliée aux clauses analysées",
      "Workflows d'approbation interne",
      "10 signatures avancées eIDAS / mois (via DocuSign)",
      "Intégrations standards",
    ],
  },
  {
    name: "Enterprise",
    tagline: "ETI de plus de 250 salariés",
    monthly: 0,
    yearly: 0,
    cta: "Nous contacter",
    contactOnly: true,
    features: [
      "Tout le Pro, plus :",
      "RBAC avancé & espaces de travail multiples",
      "Signatures avancées en volume (sur mesure)",
      "API & intégrations métier sur mesure",
      "Module d'audit & conformité RGPD renforcé",
      "SSO (authentification unique)",
      "SLA, support dédié & accompagnement",
    ],
  },
];

type SelectedPlan = {
  name: string;
  price: number;
  interval: BillingInterval;
};

/**
 * Panneau de sélection et de souscription aux offres LumenJuris.
 * Gère trois états d'affichage successifs :
 *
 * 1. **Grille des plans** — affiche les trois offres (Starter, Pro, Enterprise)
 *    avec un toggle mensuel / annuel (-20 %). Le plan "Pro" est mis en avant
 *    (`highlight`). "Enterprise" déclenche un `mailto:` au lieu d'un paiement.
 *    Une FAQ statique est affichée en bas de page.
 *
 * 2. **Paiement** (`selectedPlan !== null`) — remplace la grille par
 *    `BillingStripePanel` en mode `"plan"`. Le bouton "Retour" remet
 *    `selectedPlan` à `null` et revient à la grille.
 *
 * 3. **Confirmation** (`paymentSuccess`) — remplace tout par un écran de succès
 *    avec un bouton de retour vers `/dashboard`.
 *
 * **Prix** : stockés en euros dans `PLANS` (`monthly` / `yearly`),
 * convertis en centimes (`× 100`) avant d'être passés à `BillingStripePanel` (le montant doit-être transmis en centimes à Stripe).
 */
export function PlansPanel() {
  const [yearly, setYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userData = useUserStore((s) => s.userData);

  useEffect(() => {
    const state = location.state as { plan?: SelectedPlan } | null;
    if (state?.plan) {
      setSelectedPlan(state.plan);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, []);

  const interval: BillingInterval = yearly ? "year" : "month";

  const handlePlanSelect = (plan: Plan) => {
    if (!userData) {
      const priceEuros = yearly ? plan.yearly : plan.monthly;
      navigate("/inscription", {
        state: {
          plan: { name: plan.name, price: priceEuros * 100, interval },
        },
      });
      return;
    }
    const priceEuros = yearly ? plan.yearly : plan.monthly;
    setSelectedPlan({
      name: plan.name,
      price: priceEuros * 100,
      interval,
    });
  };

  if (paymentSuccess) {
    return (
      <div className="mx-auto max-w-6xl rounded-md bg-white px-4 py-6">
        <div className="flex flex-col items-center rounded-2xl border border-green-200 bg-green-50 px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <Check className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Abonnement activé !
          </h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Votre paiement a été accepté. Vous avez maintenant accès à toutes
            les fonctionnalités Lumen Juris.
          </p>
          <Button
            type="button"
            className="mt-6 bg-lumenjuris text-white hover:bg-lumenjuris/90"
            onClick={() => {
              setPaymentSuccess(false);
              setSelectedPlan(null);
              navigate("/dashboard");
            }}
          >
            Aller sur mon tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  if (selectedPlan) {
    return (
      <div className="mx-auto max-w-lg rounded-md bg-white px-6 py-6">
        <BillingStripePanel
          planName={selectedPlan.name}
          price={selectedPlan.price}
          interval={selectedPlan.interval}
          onBack={() => setSelectedPlan(null)}
          onSuccess={() => {
            setPaymentSuccess(true);
          }}
        />
      </div>
    );
  }




  // RETOUR DU JSX  


  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* ── En-tête + toggle mensuel/annuel ── */}
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Tarifs
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Accéder à nos outils
          </h1>
          <p className="mt-2 text-ink-muted">
            Choisissez l'offre adaptée à votre équipe. Changez ou annulez à tout
            moment.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-subtle p-1 text-sm shadow-sm">
          <button
            onClick={() => setYearly(false)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-all",
              !yearly
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setYearly(true)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-all",
              yearly
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            Annuel
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                yearly
                  ? "bg-white/20 text-white"
                  : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* ── Grille des 3 offres principales ── */}
      <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.filter((plan) => !plan.contactOnly).map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <div
              key={plan.name}
              className={cn(
                "group relative flex h-full flex-col rounded-2xl border bg-gradient-to-b to-white p-6 transition-all duration-300",
                plan.highlight
                  ? "z-10 border-brand/30 from-brand-light/70 shadow-[0_20px_45px_-15px_rgba(44,58,94,0.45)] ring-1 ring-brand/20 lg:-translate-y-3 lg:scale-[1.03]"
                  : "border-line from-brand-light/40 shadow-sm hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_18px_40px_-18px_rgba(44,58,94,0.35)]",
              )}
            >
              {/* Liseré supérieur lumineux sur l'offre mise en avant */}
              {plan.highlight && (
                <span className="absolute inset-x-8 top-0 h-1 rounded-full bg-gradient-to-r from-brand/0 via-brand to-brand/0" />
              )}

              {plan.badge && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-md">
                  <Sparkles className="h-3 w-3" />
                  {plan.badge}
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                <p className="mt-1 text-sm text-ink-muted">{plan.tagline}</p>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-4xl font-extrabold tracking-tight",
                    plan.highlight ? "text-brand" : "text-ink",
                  )}
                >
                  {price} €
                </span>
                <span className="text-sm text-ink-subtle">
                  HT / utilisateur / mois
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-subtle">
                {plan.free
                  ? "Gratuit, sans engagement"
                  : yearly
                    ? "Facturé annuellement"
                    : "Facturé mensuellement"}
              </p>

              <Button
                variant={plan.highlight ? "default" : "outline"}
                className={cn(
                  "mt-6 w-full",
                  plan.highlight
                    ? "bg-brand text-white shadow-sm hover:bg-brand-hover"
                    : "border-brand/40 text-brand hover:bg-brand-light",
                )}
                onClick={() => {
                  if (plan.free) {
                    navigate("/inscription");
                  } else {
                    handlePlanSelect(plan);
                  }
                }}
              >
                {plan.cta}
              </Button>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((f, i) => {
                  // La première ligne ("Tout le X, plus :") sert d'intertitre.
                  const isHeading = f.endsWith("plus :");
                  if (isHeading) {
                    return (
                      <li
                        key={f}
                        className="pt-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle"
                      >
                        {f}
                      </li>
                    );
                  }
                  return (
                    <li
                      key={`${plan.name}-${i}`}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          plan.highlight
                            ? "bg-brand/10 text-brand"
                            : "bg-emerald-500/10 text-emerald-600",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-ink-secondary">{f}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Offre Enterprise : bandeau pleine largeur ── */}
      {PLANS.filter((plan) => plan.contactOnly).map((plan) => (
        <div
          key={plan.name}
          className="mt-6 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-light/70 to-white p-6 shadow-sm transition-shadow hover:shadow-[0_18px_40px_-18px_rgba(44,58,94,0.35)] sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Bloc identité + prix + CTA */}
            <div className="lg:max-w-xs lg:shrink-0">
              <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">{plan.tagline}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold tracking-tight text-ink">
                  Sur devis
                </span>
                <p className="mt-1 text-xs text-ink-subtle">
                  Tarification adaptée à votre organisation
                </p>
              </div>
              <Button
                className="mt-5 w-full bg-brand text-white shadow-sm hover:bg-brand-hover sm:w-auto"
                onClick={() => {
                  window.location.href = "mailto:contact@lumenjuris.com";
                }}
              >
                {plan.cta}
              </Button>
            </div>

            {/* Fonctionnalités sur 2 colonnes */}
            <ul className="grid flex-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {plan.features.map((f, i) => {
                const isHeading = f.endsWith("plus :");
                if (isHeading) {
                  return (
                    <li
                      key={f}
                      className="text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:col-span-2"
                    >
                      {f}
                    </li>
                  );
                }
                return (
                  <li
                    key={`${plan.name}-${i}`}
                    className="flex items-start gap-2.5"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-ink-secondary">{f}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}

      {/* ── FAQ ── */}
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {[
          {
            q: "Puis-je changer d'offre à tout moment ?",
            a: "Oui. Le changement est effectif immédiatement et la facturation est ajustée au prorata.",
          },
          {
            q: "Mes données sont-elles hébergées en France ?",
            a: "Oui, l'ensemble des données est hébergé en France et conforme au RGPD.",
          },
          {
            q: "Proposez-vous une période d'essai ?",
            a: "14 jours d'essai gratuits sur l'offre Pro, sans carte bancaire requise.",
          },
          {
            q: "Comment fonctionne la facturation annuelle ?",
            a: "Vous économisez 20 % en réglant l'année en une fois. Une facture est émise automatiquement.",
          },
          {
            q: "La génération de contrats est-elle vraiment gratuite ?",
            a: "Oui, illimitée sur toutes les formules. En Free, l'export porte un filigrane Lumen Juris ; dès Starter, vos documents s'exportent sans filigrane.",
          },
          {
            q: "Pourquoi l'analyse par IA est-elle limitée en Free ?",
            a: "C'est la fonctionnalité la plus coûteuse à opérer (modèles d'IA, jurisprudence). Le Free inclut 3 analyses par mois ; Starter passe à 30, Pro les rend illimitées.",
          },
        ].map((item) => (
          <div
            key={item.q}
            className="rounded-xl border border-line bg-white p-5 transition-colors hover:border-brand/30"
          >
            <div className="font-semibold text-ink">{item.q}</div>
            <p className="mt-1 text-sm text-ink-muted">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

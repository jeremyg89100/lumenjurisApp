// Barre d'étapes du cycle de vie d'un contrat dans l'éditeur :
// ① Compléter les champs → ② Partager à l'autre partie → ③ Signer.
// L'étape courante est mise en évidence (fond teinté + pastille pleine) ;
// les étapes franchies portent une coche. Chaque étape cliquable déclenche
// l'action correspondante sans rien imposer.
import { Check, ClipboardList, Share2, FileSignature } from "lucide-react";

export interface PipelineState {
  /** Champs remplis / total (étape « Compléter les champs »). */
  filled: number;
  total: number;
  /** Session de partage ouverte pour ce document (négociation ou complétion). */
  shared: boolean;
  sharedMode?: "NEGOTIATION" | "COMPLETION";
}

interface Props {
  state: PipelineState;
  onShare: () => void;
  onSign: () => void;
  onFollow?: () => void; // ouvre l'espace de suivi quand le document est partagé
}

export function PipelineStepBar({ state, onShare, onSign, onFollow }: Props) {
  const completeDone = state.total > 0 && state.filled >= state.total;
  // Étape courante : la première non franchie. La signature reste « à venir »
  // tant qu'on est dans l'éditeur.
  const current = !completeDone ? 0 : !state.shared ? 1 : 2;

  const steps = [
    {
      icon: ClipboardList,
      label: "Compléter les champs",
      done: completeDone,
      hint: state.total === 0 ? "Aucun champ à remplir" : `${state.filled}/${state.total} champs remplis`,
      onClick: undefined as (() => void) | undefined,
    },
    {
      icon: Share2,
      label: state.shared
        ? state.sharedMode === "COMPLETION" ? "Partagé pour complétion" : "En négociation"
        : "Partager à l’autre partie",
      done: state.shared,
      hint: state.shared ? "Suivre l’avancement" : "Faire compléter ou négocier",
      onClick: state.shared ? onFollow : onShare,
    },
    {
      icon: FileSignature,
      label: "Signer",
      done: false,
      hint: "Signature électronique",
      onClick: onSign,
    },
  ];

  return (
    <div className="flex items-stretch gap-0 rounded-2xl border border-line bg-white shadow-card overflow-hidden">
      {steps.map((s, i) => {
        const isCurrent = i === current;
        const clickable = Boolean(s.onClick);
        const Comp = clickable ? "button" : "div";
        return (
          <Comp
            key={s.label}
            onClick={s.onClick}
            aria-current={isCurrent ? "step" : undefined}
            className={`relative flex-1 min-w-0 flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
              isCurrent ? "bg-brand-light/60" : ""
            } ${clickable ? "hover:bg-brand-light/40 cursor-pointer" : ""} ${i > 0 ? "border-l border-line-subtle" : ""}`}
            {...(clickable ? { type: "button" as const } : {})}
          >
            {/* Liseré : signature discrète de l'étape courante */}
            {isCurrent && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brand" />}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                s.done
                  ? "bg-brand text-white"
                  : isCurrent
                    ? "bg-brand text-white ring-4 ring-brand/15"
                    : "bg-surface-muted text-ink-muted"
              }`}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="min-w-0 hidden sm:block">
              <span className={`block truncate text-xs ${isCurrent ? "font-bold text-ink" : s.done ? "font-semibold text-ink" : "font-semibold text-ink-muted"}`}>
                {s.label}
              </span>
              <span className={`block truncate text-[10px] ${isCurrent ? "text-brand font-medium" : "text-ink-subtle"}`}>
                {s.hint}
              </span>
            </span>
            <s.icon className={`ml-auto hidden h-3.5 w-3.5 shrink-0 lg:block ${isCurrent ? "text-brand" : "text-ink-subtle"}`} />
          </Comp>
        );
      })}
    </div>
  );
}

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
      label: completeDone ? "Complété" : "Compléter",
      done: completeDone,
      onClick: undefined as (() => void) | undefined,
    },
    {
      icon: Share2,
      label: state.shared ? "Partagé" : "Partager",
      done: state.shared,
      onClick: state.shared ? onFollow : onShare,
    },
    {
      icon: FileSignature,
      label: "Signer",
      done: false,
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
            <span className={`min-w-0 hidden sm:block truncate text-sm ${isCurrent ? "font-bold text-ink" : s.done ? "font-semibold text-ink" : "font-semibold text-ink-muted"}`}>
              {s.label}
            </span>
            <s.icon className={`ml-auto hidden h-3.5 w-3.5 shrink-0 lg:block ${isCurrent ? "text-brand" : "text-ink-subtle"}`} />
          </Comp>
        );
      })}
    </div>
  );
}

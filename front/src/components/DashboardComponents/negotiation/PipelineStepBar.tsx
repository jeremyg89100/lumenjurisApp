// Barre d'étapes du cycle de vie d'un contrat dans l'éditeur :
// ① Rédiger → ② Compléter mes champs → ③ Partager → ④ Signer.
// Elle rend le chemin visible sans rien imposer : chaque étape cliquable
// déclenche l'action correspondante (partage, signature).
import { Check, PenLine, ClipboardList, Share2, FileSignature } from "lucide-react";

export interface PipelineState {
  /** Champs remplis / total (étape « Compléter mes champs »). */
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
  const steps = [
    {
      icon: PenLine,
      label: "Rédiger",
      done: true,
      hint: "Document rédigé",
      onClick: undefined as (() => void) | undefined,
    },
    {
      icon: ClipboardList,
      label: "Compléter mes champs",
      done: completeDone,
      hint: state.total === 0 ? "Aucun champ" : `${state.filled}/${state.total} champs remplis`,
      onClick: undefined,
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
        const clickable = Boolean(s.onClick);
        const Comp = clickable ? "button" : "div";
        return (
          <Comp
            key={s.label}
            onClick={s.onClick}
            className={`relative flex-1 min-w-0 flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
              clickable ? "hover:bg-brand-light/40 cursor-pointer" : ""
            } ${i > 0 ? "border-l border-line-subtle" : ""}`}
            {...(clickable ? { type: "button" as const } : {})}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                s.done ? "bg-brand text-white" : "bg-surface-muted text-ink-muted"
              }`}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="min-w-0 hidden sm:block">
              <span className={`block truncate text-xs font-semibold ${s.done ? "text-ink" : "text-ink-secondary"}`}>
                {s.label}
              </span>
              <span className="block truncate text-[10px] text-ink-subtle">{s.hint}</span>
            </span>
            <s.icon className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-ink-subtle lg:block" />
          </Comp>
        );
      })}
    </div>
  );
}

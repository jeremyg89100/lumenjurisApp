// Suivi propriétaire du mode « complétion guidée » : progression champ par
// champ, relance des invités, et passage en signature quand tout est complété.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Clock, Loader2, Mail, PenTool, Send, User as UserIcon,
} from "lucide-react";
import { negotiationApi } from "./api";
import { buildPdfFromText } from "./buildPdfFromText";
import { FIELD_SIDE_LABEL } from "./types";
import type { NegotiationDetail } from "./types";

interface Props {
  data: NegotiationDetail;
  canEdit: boolean;
  onChanged: () => void;
}

export function CompletionOwnerPanel({ data, canEdit, onChanged }: Props) {
  const navigate = useNavigate();
  const [reminding, setReminding] = useState("");
  const [remindOk, setRemindOk] = useState("");

  const external = data.fields.filter((f) => f.side !== "OWNER");
  const filled = external.filter((f) => (f.value ?? "").trim()).length;
  const ready = data.status === "VALIDATED" && data.finalVersionId != null;
  const finalVersion = data.versions.find((v) => v.isFinal) ?? data.versions[data.versions.length - 1];

  async function remind(guestId: string) {
    setReminding(guestId); setRemindOk("");
    try {
      const r = await negotiationApi.remindGuest(data.id, guestId);
      setRemindOk(r.emailSent ? guestId : "");
      setTimeout(() => setRemindOk(""), 2500);
      onChanged();
    } finally { setReminding(""); }
  }

  /** Génère le PDF du texte complété et ouvre l'assistant signature pré-alimenté. */
  function toSignature() {
    if (!finalVersion) return;
    const pdf = buildPdfFromText(data.title, finalVersion.contentText);
    navigate("/signature", {
      state: { incomingPdf: pdf.output("datauristring"), incomingName: `${data.title}.pdf` },
    });
  }

  return (
    <div className="bg-white rounded-card border border-line shadow-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest">Complétion par l’autre partie</p>
          <p className="text-xs text-ink-muted mt-1">
            {ready
              ? "Toutes les informations sont saisies : vérifiez le document puis envoyez-le en signature."
              : `${filled}/${external.length} champs remplis. Les invités reçoivent un lien nominatif ; relancez-les si besoin.`}
          </p>
        </div>
        {canEdit && ready && (
          <button onClick={toSignature} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand rounded-lg hover:bg-brand-hover transition">
            <PenTool className="w-3.5 h-3.5" /> Vérifier et envoyer en signature
          </button>
        )}
      </div>

      <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${external.length ? Math.round((filled / external.length) * 100) : 0}%` }} />
      </div>

      {/* Champs par partie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(["COUNTERPARTY", "THIRD_PARTY"] as const)
          .filter((side) => data.fields.some((f) => f.side === side))
          .map((side) => (
            <div key={side} className="rounded-xl border border-line-subtle p-3">
              <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest mb-2">
                {FIELD_SIDE_LABEL[side]}
              </p>
              <ul className="space-y-1">
                {data.fields.filter((f) => f.side === side).map((f) => {
                  const done = (f.value ?? "").trim().length > 0;
                  return (
                    <li key={f.id} className="flex items-center gap-2 text-xs">
                      {done
                        ? <Check className="w-3.5 h-3.5 shrink-0 text-success" />
                        : <Clock className="w-3.5 h-3.5 shrink-0 text-ink-subtle" />}
                      <span className="min-w-0 flex-1 truncate text-ink-secondary">{f.label}</span>
                      {done && <span className="truncate max-w-[45%] text-ink font-medium" title={f.value ?? ""}>{f.value}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>

      {/* Invités : relance */}
      {data.guestAccesses.filter((g) => g.active).length > 0 && (
        <div className="space-y-1.5">
          {data.guestAccesses.filter((g) => g.active).map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-surface-subtle">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary min-w-0">
                <UserIcon className="w-3.5 h-3.5 shrink-0 text-ink-subtle" />
                <span className="truncate">{g.name || g.email || "Invité"}</span>
                {g.email && <span className="text-[10px] text-ink-subtle truncate hidden sm:inline">({g.email})</span>}
              </span>
              {canEdit && g.email && !ready && (
                <button
                  onClick={() => void remind(g.id)}
                  disabled={reminding === g.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand-light rounded-md shrink-0 disabled:opacity-50"
                >
                  {reminding === g.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : remindOk === g.id ? <Check className="w-3 h-3 text-success" /> : <Send className="w-3 h-3" />}
                  {remindOk === g.id ? "Relance envoyée" : "Relancer"}
                </button>
              )}
              {!g.email && <span className="inline-flex items-center gap-1 text-[10px] text-ink-subtle"><Mail className="w-3 h-3" /> lien copié manuellement</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

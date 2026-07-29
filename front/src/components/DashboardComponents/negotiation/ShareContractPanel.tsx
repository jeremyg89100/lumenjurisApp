// « Partager à l'autre partie » — panneau LATÉRAL intégré à l'éditeur (pas de
// pop-up) : on reste sur le contrat. Deux parcours :
//   · Compléter et signer : chaque champ du document est surligné à la couleur
//     de la partie qui doit le remplir ; un clic sur le champ (dans le contrat
//     ou dans la liste) change l'assignation. Puis le contrat part en signature.
//   · Négocier : l'autre partie relit, commente et propose des modifications.
// L'assignation est proposée par heuristique, corrigeable d'un clic.
import { useState } from "react";
import {
  X, Loader2, Link2, Copy, Check, MessagesSquare, ClipboardEdit,
  ArrowRight, ChevronLeft, Mail, Plus, Trash2,
} from "lucide-react";
import { negotiationApi } from "./api";
import type { CompletionFieldPayload } from "./api";
import { FIELD_SIDE_LABEL, FIELD_SIDE_COLOR } from "./types";
import type { FieldSide } from "./types";

export interface ShareVariable {
  id: string;
  label: string;
  value: string;
}

export type ShareMode = "choice" | "completion" | "negotiation" | "done";

/** Ordre de rotation au clic sur un champ (document ou liste). */
export const SIDE_CYCLE: FieldSide[] = ["OWNER", "COUNTERPARTY", "THIRD_PARTY"];

/** Heuristique d'assignation : mots-clés du libellé, sinon rempli = moi / vide = l'autre partie. */
export function guessSide(v: ShareVariable): FieldSide {
  const l = v.label.toLowerCase();
  if (/(établissement|ecole|école|université|academie|académie|tuteur enseignant|enseignant référent)/.test(l)) return "THIRD_PARTY";
  if (/(stagiaire|salarié|salarie|candidat|locataire|preneur|emprunteur|cocontractant|signataire|autre partie|client)/.test(l)) return "COUNTERPARTY";
  return v.value.trim() ? "OWNER" : "COUNTERPARTY";
}

interface Recipient {
  email: string;
  side: "COUNTERPARTY" | "THIRD_PARTY";
}

interface SharedResult {
  negotiationId: string;
  mode: "NEGOTIATION" | "COMPLETION";
  links: { name: string; url: string; emailSent: boolean }[];
}

interface Props {
  onClose: () => void;
  title: string;
  variables: ShareVariable[];
  mode: ShareMode;
  onModeChange: (m: ShareMode) => void;
  /** Assignation des champs (contrôlée par l'éditeur, qui colore le document). */
  sideOf: (id: string) => FieldSide;
  onSideChange: (id: string, side: FieldSide) => void;
  /** Sérialise le document : marqueurs {{id}} pour `externalIds`, valeurs sinon. */
  getMarkedText: (externalIds: Set<string>) => string;
  /** Texte « aplati » (valeurs actuelles) pour le mode négociation. */
  getPlainText: () => string;
  /** Enregistre le contrat en contrathèque, renvoie son identifiant. */
  createContract: () => Promise<{ id: string }>;
  onShared: (r: SharedResult) => void;
}

/** Type de saisie deviné d'après le libellé (validé aussi côté serveur). */
function guessType(label: string): string {
  const l = label.toLowerCase();
  if (/(e-?mail|courriel)/.test(l)) return "email";
  if (/(date|née? le|debut|début|fin d)/.test(l)) return "date";
  if (/iban/.test(l)) return "iban";
  if (/(montant|salaire|gratification|prix|somme|€|euros)/.test(l)) return "number";
  return "text";
}

function guestUrl(token: string): string {
  return `${window.location.origin}/negociation-invite/${token}`;
}

export function ShareContractPanel({
  onClose, title, variables, mode, onModeChange, sideOf, onSideChange,
  getMarkedText, getPlainText, createContract, onShared,
}: Props) {
  const [recipients, setRecipients] = useState<Recipient[]>([{ email: "", side: "COUNTERPARTY" }]);
  const ttl = 168; // durée de validité du lien : 7 jours
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SharedResult | null>(null);
  const [copied, setCopied] = useState("");

  const externalIds = new Set(variables.filter((v) => sideOf(v.id) !== "OWNER").map((v) => v.id));
  const hasThirdParty = variables.some((v) => sideOf(v.id) === "THIRD_PARTY");
  const countBySide = (s: FieldSide) => variables.filter((v) => sideOf(v.id) === s).length;

  function cycleSide(id: string) {
    const next = SIDE_CYCLE[(SIDE_CYCLE.indexOf(sideOf(id)) + 1) % SIDE_CYCLE.length];
    onSideChange(id, next);
  }

  function close() {
    setError(""); setBusy(false); setResult(null);
    onClose();
  }

  async function shareCompletion() {
    const dest = recipients.filter((r) => r.email.trim());
    if (externalIds.size === 0) { setError("Assignez au moins un champ à l’autre partie."); return; }
    if (dest.length === 0) { setError("Indiquez au moins un destinataire."); return; }
    setBusy(true); setError("");
    try {
      const contract = await createContract();
      const fields: CompletionFieldPayload[] = variables.map((v, i) => ({
        variableId: v.id,
        label: v.label,
        type: guessType(v.label),
        side: sideOf(v.id),
        required: sideOf(v.id) !== "OWNER",
        position: i,
        value: sideOf(v.id) === "OWNER" ? v.value : null,
      }));
      const nego = await negotiationApi.enterCompletion({
        contractExternalId: contract.id,
        title,
        contentText: getMarkedText(externalIds),
        fields,
        autoToSignature: false,
      });
      const links: SharedResult["links"] = [];
      for (const r of dest) {
        const g = await negotiationApi.inviteGuest(nego.id, {
          ttlHours: ttl,
          email: r.email.trim(),
          role: "FILLER",
          fillSide: r.side,
          sendEmail: true,
        });
        links.push({ name: r.email.trim(), url: guestUrl(g.token), emailSent: g.emailSent });
      }
      const res: SharedResult = { negotiationId: nego.id, mode: "COMPLETION", links };
      setResult(res); onModeChange("done"); onShared(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le partage a échoué. Réessayez.");
    } finally { setBusy(false); }
  }

  async function shareNegotiation() {
    const dest = recipients.filter((r) => r.email.trim());
    setBusy(true); setError("");
    try {
      const contract = await createContract();
      // La session de négociation se nourrit du texte du contrat (ocrText),
      // déjà transmis par createContract ; enter() crée la version initiale.
      void getPlainText;
      const nego = await negotiationApi.enter(contract.id, `Négociation — ${title}`);
      const links: SharedResult["links"] = [];
      for (const r of dest) {
        const g = await negotiationApi.inviteGuest(nego.id, {
          ttlHours: ttl,
          email: r.email.trim(),
          role: "COMMENTER",
          sendEmail: true,
        });
        links.push({ name: r.email.trim(), url: guestUrl(g.token), emailSent: g.emailSent });
      }
      const res: SharedResult = { negotiationId: nego.id, mode: "NEGOTIATION", links };
      setResult(res); onModeChange("done"); onShared(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le partage a échoué. Réessayez.");
    } finally { setBusy(false); }
  }

  function copy(url: string) {
    void navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(""), 1500);
  }

  const recipientsBlock = (withSide: boolean) => (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-subtle">Destinataires</p>
      {recipients.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={r.email}
            onChange={(e) => setRecipients((rs) => rs.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
            placeholder="E-mail du destinataire"
            type="email"
            className="min-w-0 flex-1 rounded-lg border border-line px-2.5 py-2 text-sm outline-none focus:border-brand/40 placeholder:text-ink-placeholder"
          />
          {withSide && hasThirdParty && (
            <select
              value={r.side}
              onChange={(e) => setRecipients((rs) => rs.map((x, j) => (j === i ? { ...x, side: e.target.value as Recipient["side"] } : x)))}
              className="shrink-0 rounded-lg border border-line px-2 py-2 text-xs outline-none focus:border-brand/40 cursor-pointer"
            >
              <option value="COUNTERPARTY">Autre partie</option>
              <option value="THIRD_PARTY">Tiers</option>
            </select>
          )}
          {recipients.length > 1 && (
            <button onClick={() => setRecipients((rs) => rs.filter((_, j) => j !== i))} className="p-1 rounded-md text-ink-subtle hover:text-danger hover:bg-danger-light" title="Retirer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {recipients.length < 3 && (
        <button onClick={() => setRecipients((rs) => [...rs, { email: "", side: "COUNTERPARTY" }])} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <Plus className="w-3.5 h-3.5" /> Ajouter un destinataire
        </button>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card-md">
      <div className="flex items-center justify-between gap-2 border-b border-line-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {mode !== "choice" && mode !== "done" && (
            <button onClick={() => { onModeChange("choice"); setError(""); }} className="p-1 rounded-md text-ink-subtle hover:bg-surface-muted" title="Retour">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="truncate text-sm font-bold text-ink">Partager à l’autre partie</h2>
        </div>
        <button onClick={close} className="p-1 rounded-md text-ink-subtle hover:bg-surface-muted" title="Fermer"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-4 p-4">
        {mode === "choice" && (
          <div className="space-y-3">
            <button onClick={() => onModeChange("completion")} className="w-full text-left rounded-xl border border-line p-3.5 hover:border-brand/50 hover:bg-brand-light/30 transition-all group">
              <ClipboardEdit className="w-5 h-5 text-brand mb-1.5" />
              <p className="text-sm font-semibold text-ink">Pour compléter et signer</p>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                L’autre partie remplit uniquement les champs qui la concernent,
                puis le contrat part en signature.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-1.5">Choisir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
            </button>
            <button onClick={() => onModeChange("negotiation")} className="w-full text-left rounded-xl border border-line p-3.5 hover:border-brand/50 hover:bg-brand-light/30 transition-all group">
              <MessagesSquare className="w-5 h-5 text-brand mb-1.5" />
              <p className="text-sm font-semibold text-ink">Pour négocier</p>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                L’autre partie relit, surligne, commente et propose des
                reformulations. Vous gardez la main sur chaque version.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-1.5">Choisir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
            </button>
          </div>
        )}

        {mode === "completion" && (
          <>
            <div className="space-y-2">
              {/* Légende des couleurs — cliquer un champ (document ou liste) change l'assignation */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-surface-subtle px-2.5 py-2">
                {(Object.keys(FIELD_SIDE_LABEL) as FieldSide[]).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: FIELD_SIDE_COLOR[s].dot }} />
                    {FIELD_SIDE_LABEL[s]} · {countBySide(s)}
                  </span>
                ))}
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line-subtle">
                {variables.map((v) => {
                  const side = sideOf(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => cycleSide(v.id)}
                      title={`${v.label} — rempli par : ${FIELD_SIDE_LABEL[side]} (cliquer pour changer)`}
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface-subtle transition-colors"
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: FIELD_SIDE_COLOR[side].dot }} />
                      <span className="min-w-0 flex-1 truncate text-xs text-ink-secondary">{v.label}</span>
                      <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: FIELD_SIDE_COLOR[side].chip, color: FIELD_SIDE_COLOR[side].dot }}>
                        {FIELD_SIDE_LABEL[side]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {recipientsBlock(true)}

            {error && <p className="text-xs text-danger">{error}</p>}
            <button onClick={() => void shareCompletion()} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-brand-hover transition disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Créer les liens et inviter
            </button>
          </>
        )}

        {mode === "negotiation" && (
          <>
            <p className="text-xs text-ink-muted leading-relaxed">
              Le document est enregistré dans la contrathèque et un espace de négociation
              s’ouvre : versions, commentaires ancrés au texte et propositions de
              modification, avec piste d’audit complète.
            </p>
            {recipientsBlock(false)}
            {error && <p className="text-xs text-danger">{error}</p>}
            <button onClick={() => void shareNegotiation()} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-brand-hover transition disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessagesSquare className="w-4 h-4" />}
              Ouvrir la négociation
            </button>
          </>
        )}

        {mode === "done" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-light px-3 py-2.5">
              <Check className="w-4 h-4 text-success-dark shrink-0" />
              <p className="text-xs text-success-dark font-medium">
                {result.mode === "COMPLETION"
                  ? "Document partagé pour complétion. Vous suivrez la progression champ par champ."
                  : "Espace de négociation ouvert et partagé."}
              </p>
            </div>
            <div className="space-y-2">
              {result.links.map((l) => (
                <div key={l.url} className="rounded-lg bg-surface-subtle px-3 py-2">
                  <p className="text-xs font-semibold text-ink truncate">{l.name}</p>
                  <p className={`text-[11px] inline-flex items-center gap-1 ${l.emailSent ? "text-ink-subtle" : "text-amber-700"}`}>
                    {l.emailSent
                      ? <><Mail className="w-3 h-3" /> Invitation envoyée par e-mail</>
                      : <><Mail className="w-3 h-3" /> E-mail non envoyé — copiez le lien et transmettez-le</>}
                  </p>
                  <button onClick={() => copy(l.url)} className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand-light rounded-md">
                    {copied === l.url ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copied === l.url ? "Copié" : "Copier le lien"}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <a href={`/negociation/${result.negotiationId}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition">
                Ouvrir l’espace de suivi <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <button onClick={close} className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-white border border-line rounded-lg hover:bg-surface-subtle transition">
                Rester dans l’éditeur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

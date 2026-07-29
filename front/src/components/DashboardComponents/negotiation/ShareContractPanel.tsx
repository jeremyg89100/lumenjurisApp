// « Partager à l'autre partie » — geste unique de l'éditeur, deux parcours :
//   · Compléter et signer : l'autre partie remplit les champs qui lui sont
//     assignés via un lien nominatif, puis le contrat part en signature.
//   · Négocier : l'autre partie relit, commente et propose des modifications.
// Le panneau assigne les variables (heuristique corrigeable en un clic), crée
// le contrat en contrathèque, ouvre la session et envoie les invitations.
import { useMemo, useState } from "react";
import {
  X, Loader2, Link2, Copy, Check, MessagesSquare, ClipboardEdit,
  ArrowRight, ChevronLeft, Mail, ShieldCheck, Plus, Trash2,
} from "lucide-react";
import { negotiationApi } from "./api";
import type { CompletionFieldPayload } from "./api";
import { FIELD_SIDE_LABEL } from "./types";
import type { FieldSide } from "./types";

export interface ShareVariable {
  id: string;
  label: string;
  value: string;
}

interface Recipient {
  name: string;
  email: string;
  side: "COUNTERPARTY" | "THIRD_PARTY";
}

interface SharedResult {
  negotiationId: string;
  mode: "NEGOTIATION" | "COMPLETION";
  links: { name: string; url: string; emailSent: boolean }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  variables: ShareVariable[];
  /** Sérialise le document : marqueurs {{id}} pour `externalIds`, valeurs sinon. */
  getMarkedText: (externalIds: Set<string>) => string;
  /** Texte « aplati » (valeurs actuelles) pour le mode négociation. */
  getPlainText: () => string;
  /** Enregistre le contrat en contrathèque, renvoie son identifiant. */
  createContract: () => Promise<{ id: string }>;
  onShared: (r: SharedResult) => void;
}

/** Heuristique d'assignation : mots-clés du libellé, sinon rempli = moi / vide = l'autre partie. */
function guessSide(v: ShareVariable): FieldSide {
  const l = v.label.toLowerCase();
  if (/(établissement|ecole|école|université|academie|académie|tuteur enseignant|enseignant référent)/.test(l)) return "THIRD_PARTY";
  if (/(stagiaire|salarié|salarie|candidat|locataire|preneur|emprunteur|cocontractant|signataire|autre partie|client)/.test(l)) return "COUNTERPARTY";
  return v.value.trim() ? "OWNER" : "COUNTERPARTY";
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

const TTL_OPTIONS = [
  { value: 72, label: "3 jours" },
  { value: 168, label: "7 jours" },
  { value: 720, label: "30 jours" },
];

export function ShareContractPanel({
  open, onClose, title, variables, getMarkedText, getPlainText, createContract, onShared,
}: Props) {
  const [mode, setMode] = useState<"choice" | "completion" | "negotiation" | "done">("choice");
  const [sides, setSides] = useState<Record<string, FieldSide>>({});
  const [recipients, setRecipients] = useState<Recipient[]>([{ name: "", email: "", side: "COUNTERPARTY" }]);
  const [ttl, setTtl] = useState(168);
  const [autoSign, setAutoSign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SharedResult | null>(null);
  const [copied, setCopied] = useState("");

  const initialSides = useMemo(() => {
    const map: Record<string, FieldSide> = {};
    for (const v of variables) map[v.id] = guessSide(v);
    return map;
  }, [variables]);

  const sideOf = (id: string): FieldSide => sides[id] ?? initialSides[id] ?? "COUNTERPARTY";
  const externalIds = useMemo(
    () => new Set(variables.filter((v) => sideOf(v.id) !== "OWNER").map((v) => v.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variables, sides, initialSides],
  );
  const hasThirdParty = variables.some((v) => sideOf(v.id) === "THIRD_PARTY");

  if (!open) return null;

  function reset() {
    setMode("choice"); setError(""); setBusy(false); setResult(null);
  }

  async function shareCompletion() {
    const dest = recipients.filter((r) => r.name.trim() || r.email.trim());
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
        autoToSignature: autoSign,
      });
      const links: SharedResult["links"] = [];
      for (const r of dest) {
        const g = await negotiationApi.inviteGuest(nego.id, {
          ttlHours: ttl,
          name: r.name.trim() || undefined,
          email: r.email.trim() || undefined,
          role: "FILLER",
          fillSide: r.side,
          sendEmail: Boolean(r.email.trim()),
        });
        links.push({ name: r.name.trim() || r.email.trim() || "Invité", url: guestUrl(g.token), emailSent: g.emailSent });
      }
      const res: SharedResult = { negotiationId: nego.id, mode: "COMPLETION", links };
      setResult(res); setMode("done"); onShared(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le partage a échoué. Réessayez.");
    } finally { setBusy(false); }
  }

  async function shareNegotiation() {
    const dest = recipients.filter((r) => r.name.trim() || r.email.trim());
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
          name: r.name.trim() || undefined,
          email: r.email.trim() || undefined,
          role: "COMMENTER",
          sendEmail: Boolean(r.email.trim()),
        });
        links.push({ name: r.name.trim() || r.email.trim() || "Invité", url: guestUrl(g.token), emailSent: g.emailSent });
      }
      const res: SharedResult = { negotiationId: nego.id, mode: "NEGOTIATION", links };
      setResult(res); setMode("done"); onShared(res);
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
        <div key={i} className="flex items-center gap-2">
          <input
            value={r.name}
            onChange={(e) => setRecipients((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder="Nom (ex. Marie Dupont)"
            className="flex-1 min-w-0 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand/40 placeholder:text-ink-placeholder"
          />
          <input
            value={r.email}
            onChange={(e) => setRecipients((rs) => rs.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
            placeholder="E-mail (invitation automatique)"
            type="email"
            className="flex-1 min-w-0 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand/40 placeholder:text-ink-placeholder"
          />
          {withSide && hasThirdParty && (
            <select
              value={r.side}
              onChange={(e) => setRecipients((rs) => rs.map((x, j) => (j === i ? { ...x, side: e.target.value as Recipient["side"] } : x)))}
              className="rounded-lg border border-line px-2 py-2 text-xs outline-none focus:border-brand/40 cursor-pointer"
            >
              <option value="COUNTERPARTY">Autre partie</option>
              <option value="THIRD_PARTY">Tiers</option>
            </select>
          )}
          {recipients.length > 1 && (
            <button onClick={() => setRecipients((rs) => rs.filter((_, j) => j !== i))} className="p-1.5 rounded-md text-ink-subtle hover:text-danger hover:bg-danger-light" title="Retirer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {recipients.length < 3 && (
        <button onClick={() => setRecipients((rs) => [...rs, { name: "", email: "", side: "COUNTERPARTY" }])} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <Plus className="w-3.5 h-3.5" /> Ajouter un destinataire
        </button>
      )}
    </div>
  );

  const ttlBlock = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-muted">Lien valable</span>
      <select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} className="rounded-lg border border-line px-2 py-1.5 text-xs outline-none focus:border-brand/40 cursor-pointer">
        {TTL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-subtle ml-auto">
        <ShieldCheck className="w-3.5 h-3.5" /> Lien nominatif, chiffré, révocable
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => { if (!busy) { reset(); onClose(); } }} />
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-card-md border border-line">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line-subtle bg-white px-5 py-3.5 rounded-t-2xl">
          <div className="flex items-center gap-2 min-w-0">
            {mode !== "choice" && mode !== "done" && (
              <button onClick={() => { setMode("choice"); setError(""); }} className="p-1 rounded-md text-ink-subtle hover:bg-surface-muted"><ChevronLeft className="w-4 h-4" /></button>
            )}
            <h2 className="text-sm font-bold text-ink truncate">Partager à l’autre partie — {title}</h2>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="p-1 rounded-md text-ink-subtle hover:bg-surface-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {mode === "choice" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setMode("completion")} className="text-left rounded-xl border border-line p-4 hover:border-brand/50 hover:bg-brand-light/30 transition-all group">
                <ClipboardEdit className="w-6 h-6 text-brand mb-2" />
                <p className="text-sm font-semibold text-ink">Pour compléter et signer</p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  L’autre partie remplit uniquement les champs qui la concernent
                  (identité, dates…), puis le contrat part en signature.
                  Idéal : convention de stage, CDD, prestation.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-2">Choisir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
              </button>
              <button onClick={() => setMode("negotiation")} className="text-left rounded-xl border border-line p-4 hover:border-brand/50 hover:bg-brand-light/30 transition-all group">
                <MessagesSquare className="w-6 h-6 text-brand mb-2" />
                <p className="text-sm font-semibold text-ink">Pour négocier</p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  L’autre partie relit le document, surligne des passages, commente
                  et propose des reformulations. Vous gardez la main sur chaque
                  version.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-2">Choisir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
              </button>
            </div>
          )}

          {mode === "completion" && (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-subtle">
                  Qui remplit chaque champ ?
                </p>
                <p className="text-xs text-ink-muted">
                  Assignation proposée automatiquement — corrigez d’un clic. Les champs
                  « {FIELD_SIDE_LABEL.OWNER} » gardent la valeur déjà saisie dans l’éditeur.
                </p>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line-subtle">
                  {variables.map((v) => {
                    const side = sideOf(v.id);
                    return (
                      <div key={v.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-secondary" title={v.label}>
                          {v.label}
                          {side === "OWNER" && v.value.trim() && (
                            <span className="ml-2 text-[11px] text-ink-subtle">— {v.value.slice(0, 30)}</span>
                          )}
                        </span>
                        <div className="flex rounded-lg border border-line overflow-hidden shrink-0">
                          {(["OWNER", "COUNTERPARTY", "THIRD_PARTY"] as FieldSide[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => setSides((m) => ({ ...m, [v.id]: s }))}
                              className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                                side === s ? "bg-brand text-white" : "bg-white text-ink-muted hover:bg-surface-subtle"
                              }`}
                            >
                              {FIELD_SIDE_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {recipientsBlock(true)}
              {ttlBlock}

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={autoSign} onChange={(e) => setAutoSign(e.target.checked)} className="mt-0.5 accent-[#1B2A4A]" />
                <span className="text-xs text-ink-secondary leading-relaxed">
                  Proposer la signature dès que tout est complété
                  <span className="block text-[11px] text-ink-subtle">
                    Sinon, vous vérifiez les informations saisies avant d’envoyer en signature (recommandé).
                  </span>
                </span>
              </label>

              {error && <p className="text-xs text-danger">{error}</p>}
              <button onClick={() => void shareCompletion()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-brand-hover transition disabled:opacity-50">
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
              {ttlBlock}
              {error && <p className="text-xs text-danger">{error}</p>}
              <button onClick={() => void shareNegotiation()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-brand-hover transition disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessagesSquare className="w-4 h-4" />}
                Ouvrir la négociation
              </button>
            </>
          )}

          {mode === "done" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-light px-4 py-3">
                <Check className="w-4 h-4 text-success-dark shrink-0" />
                <p className="text-sm text-success-dark font-medium">
                  {result.mode === "COMPLETION"
                    ? "Document partagé pour complétion. Vous suivrez la progression champ par champ."
                    : "Espace de négociation ouvert et partagé."}
                </p>
              </div>
              <div className="space-y-2">
                {result.links.map((l) => (
                  <div key={l.url} className="flex items-center justify-between gap-2 rounded-lg bg-surface-subtle px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{l.name}</p>
                      <p className="text-[11px] text-ink-subtle inline-flex items-center gap-1">
                        {l.emailSent
                          ? <><Mail className="w-3 h-3" /> Invitation envoyée par e-mail</>
                          : "Transmettez ce lien à votre interlocuteur"}
                      </p>
                    </div>
                    <button onClick={() => copy(l.url)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand-light rounded-md shrink-0">
                      {copied === l.url ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                      {copied === l.url ? "Copié" : "Copier le lien"}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <a href={`/negociation/${result.negotiationId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition">
                  Ouvrir l’espace de suivi <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => { reset(); onClose(); }} className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-white border border-line rounded-lg hover:bg-surface-subtle transition">
                  Rester dans l’éditeur
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

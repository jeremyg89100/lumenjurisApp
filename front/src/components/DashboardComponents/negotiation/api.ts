/**
 * Couche d'accès API du module Négociation (passe par le proxy).
 */
import { fetchProxy } from "../../../utils/fetchProxy";
import type {
  NegotiationDetail, DiffResult, ProposalStatus, GuestNegotiation,
  NegotiationListItem, FieldSide,
} from "./types";

/** Champ transmis à l'ouverture d'une complétion guidée. */
export interface CompletionFieldPayload {
  variableId: string;
  label: string;
  type?: string;
  side?: FieldSide;
  required?: boolean;
  position?: number;
  value?: string | null;
}

const BASE = "/api/negotiation";

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json()) as { success?: boolean; data?: T; message?: string };
  if (!res.ok || data.success === false) throw new Error(data.message || `Erreur ${res.status}`);
  return data.data as T;
}

function postJson(path: string, body?: unknown) {
  return fetchProxy(path, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export const negotiationApi = {
  /** Page « Mes négociations » : toutes les sessions de l'utilisateur. */
  list: () =>
    fetchProxy(`${BASE}/`, { credentials: "include" }).then(json<NegotiationListItem[]>),

  /** Ouvre (ou réutilise) une négociation pour un contrat. */
  enter: (contractExternalId: string, title?: string) =>
    postJson(`${BASE}/enter`, { contractExternalId, title }).then(json<{ id: string; status: string }>),

  /** Ouvre une complétion guidée (texte avec marqueurs {{variableId}} + champs). */
  enterCompletion: (p: {
    contractExternalId: string; title?: string; contentText: string;
    fields: CompletionFieldPayload[]; autoToSignature?: boolean;
  }) => postJson(`${BASE}/enter-completion`, p).then(json<{ id: string }>),

  listForContract: (contractExternalId: string) =>
    fetchProxy(`${BASE}/contract/${contractExternalId}`, { credentials: "include" }).then(json<unknown[]>),

  get: (id: string) =>
    fetchProxy(`${BASE}/${id}`, { credentials: "include" }).then(json<NegotiationDetail>),

  abort: (id: string) => postJson(`${BASE}/${id}/abort`).then(json<unknown>),
  exit: (id: string) => postJson(`${BASE}/${id}/exit`).then(json<unknown>),

  // Versions
  createVersion: (id: string, contentText: string, label?: string) =>
    postJson(`${BASE}/${id}/versions`, { contentText, label }).then(json<{ id: string; versionNumber: number }>),
  validateVersion: (id: string, versionId: string) =>
    postJson(`${BASE}/${id}/versions/${versionId}/validate`).then(json<unknown>),

  // Propositions / redlines
  addProposal: (id: string, p: { clauseRef: string; proposedText: string; originalText?: string; type?: string }) =>
    postJson(`${BASE}/${id}/proposals`, p).then(json<{ id: string }>),
  setProposalStatus: (id: string, proposalId: string, status: ProposalStatus) =>
    fetchProxy(`${BASE}/${id}/proposals/${proposalId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(json<unknown>),

  // Annotations / commentaires (ancrés sur le texte)
  addComment: (id: string, c: { body: string; clauseRef?: string | null; visibility?: string; anchorStart?: number | null; anchorEnd?: number | null; quote?: string | null; proposedText?: string | null }) =>
    postJson(`${BASE}/${id}/comments`, c).then(json<{ id: string }>),
  resolveComment: (id: string, commentId: string, resolved: boolean) =>
    fetchProxy(`${BASE}/${id}/comments/${commentId}/resolve`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    }).then(json<unknown>),

  // Participants
  addParticipant: (id: string, p: { side: string; role: string; name?: string; email?: string }) =>
    postJson(`${BASE}/${id}/participants`, p).then(json<{ id: string }>),
  removeParticipant: (id: string, participantId: string) =>
    fetchProxy(`${BASE}/${id}/participants/${participantId}`, { method: "DELETE", credentials: "include" }).then(json<unknown>),

  // Invités (liens nominatifs : nom + e-mail → e-mail d'invitation automatique)
  inviteGuest: (id: string, opts?: {
    ttlHours?: number; name?: string; email?: string;
    role?: string; fillSide?: "COUNTERPARTY" | "THIRD_PARTY"; sendEmail?: boolean;
  }) =>
    postJson(`${BASE}/${id}/guests`, opts ?? {}).then(
      json<{ id: string; token: string; name: string | null; email: string | null; expiresAt: string; emailSent: boolean }>,
    ),
  remindGuest: (id: string, guestId: string) =>
    postJson(`${BASE}/${id}/guests/${guestId}/remind`).then(json<{ emailSent: boolean }>),
  revokeGuest: (id: string, guestId: string) =>
    postJson(`${BASE}/${id}/guests/${guestId}/revoke`).then(json<unknown>),

  /** Diff structuré clause par clause (délégué à FastAPI via le proxy). */
  diff: async (leftText: string, rightText: string): Promise<DiffResult> => {
    const res = await fetchProxy(`/api/negotiation-diff`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leftText, rightText }),
    });
    const data = (await res.json()) as DiffResult & { success?: boolean; message?: string };
    if (!res.ok || data.success === false) throw new Error(data.message || `Échec du diff (${res.status})`);
    return data;
  },
};

// ── Accès invité (page publique, par token) ──
export const guestApi = {
  get: (token: string) =>
    fetchProxy(`${BASE}/public/${token}`).then(json<GuestNegotiation>),
  addComment: (token: string, c: { body: string; clauseRef?: string | null; anchorStart?: number | null; anchorEnd?: number | null; quote?: string | null; proposedText?: string | null }) =>
    fetchProxy(`${BASE}/public/${token}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    }).then(json<{ id: string }>),

  /** Complétion guidée : enregistre les valeurs saisies (partiel autorisé). */
  saveFields: (token: string, values: Record<string, string>) =>
    fetchProxy(`${BASE}/public/${token}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }).then(json<{ saved: number; invalid: string[] }>),

  /** Complétion guidée : l'invité déclare avoir terminé. */
  complete: (token: string) =>
    fetchProxy(`${BASE}/public/${token}/complete`, { method: "POST" }).then(
      json<{ done: boolean; allPartiesDone?: boolean; autoToSignature?: boolean; missing?: { id: string; label: string }[] }>,
    ),
};

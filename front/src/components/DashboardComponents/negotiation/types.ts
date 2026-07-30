export type NegotiationStatus = "DRAFT" | "IN_NEGOTIATION" | "VALIDATED" | "BLOCKED" | "CLOSED";
export type NegotiationMode = "NEGOTIATION" | "COMPLETION";
export type FieldSide = "OWNER" | "COUNTERPARTY" | "THIRD_PARTY";
export type ProposalStatus = "PROPOSED" | "ACCEPTED" | "REJECTED" | "COUNTERED";
export type CommentVisibility = "INTERNAL" | "EXTERNAL";
export type ParticipantSide = "INTERNAL" | "EXTERNAL";
export type ParticipantRole = "READER" | "COMMENTER" | "PROPOSER" | "VALIDATOR" | "FILLER";

/** Champ à compléter par une partie (mode COMPLETION). */
export interface NegoField {
  id: string;
  variableId: string;
  label: string;
  type: string;
  side: FieldSide;
  required: boolean;
  position: number;
  value: string | null;
  filledAt: string | null;
}

export interface NegoVersion {
  id: string;
  versionNumber: number;
  label: string | null;
  contentText: string;
  createdById: number;
  isFinal: boolean;
  createdAt: string;
}

export interface NegoProposal {
  id: string;
  clauseRef: string;
  originalText: string | null;
  proposedText: string;
  type: string;
  status: ProposalStatus;
  createdById: number | null;
  createdAt: string;
}

export interface NegoComment {
  id: string;
  clauseRef: string | null;
  body: string;
  visibility: CommentVisibility;
  parentCommentId: number | null;
  createdById: number | null;
  authorParticipantId: number | null;
  authorName: string;
  anchorStart: number | null;
  anchorEnd: number | null;
  quote: string | null;
  proposedText: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface NegoParticipant {
  id: string;
  side: ParticipantSide;
  role: ParticipantRole;
  userId: number | null;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export interface NegoGuest {
  id: string;
  token: string;
  participantId: number | null;
  name: string | null;
  email: string | null;
  fillSide: FieldSide | null;
  lastSentAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface NegoAudit {
  action: string;
  actorUserId: number | null;
  actorLabel: string | null;
  versionId: number | null;
  createdAt: string;
}

export interface NegotiationDetail {
  id: string;
  contractExternalId: string;
  title: string;
  status: NegotiationStatus;
  mode: NegotiationMode;
  autoToSignature: boolean;
  ownerUserId: number;
  finalVersionId: number | null;
  fields: NegoField[];
  versions: NegoVersion[];
  proposals: NegoProposal[];
  comments: NegoComment[];
  participants: NegoParticipant[];
  guestAccesses: NegoGuest[];
  auditLogs: NegoAudit[];
  createdAt: string;
  updatedAt: string;
}

/** Ligne de la page « Mes négociations ». */
export interface NegotiationListItem {
  id: string;
  contractExternalId: string;
  title: string;
  status: NegotiationStatus;
  mode: NegotiationMode;
  counts: { versions: number; proposals: number; comments: number };
  guests: { name: string | null; email: string | null; active: boolean }[];
  completion: { filled: number; total: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiffLine {
  type: "equal" | "added" | "removed";
  text: string;
}
export interface DiffClause {
  ref: string;
  title: string;
  status: "unchanged" | "modified" | "added" | "removed";
  lines: DiffLine[];
}
export interface DiffResult {
  clauses: DiffClause[];
  stats: { added: number; removed: number; modified: number; unchanged: number };
}

/** Vue invité : détail + identité/rôle de l'invité. */
export interface GuestNegotiation extends NegotiationDetail {
  guest: {
    role: ParticipantRole;
    name: string | null;
    canComment: boolean;
    canFill: boolean;
    fillSide: FieldSide;
  };
}

export const STATUS_LABEL: Record<NegotiationStatus, string> = {
  DRAFT: "Brouillon",
  IN_NEGOTIATION: "En négociation",
  VALIDATED: "Validé",
  BLOCKED: "Bloqué",
  CLOSED: "Clos",
};
export const STATUS_STYLE: Record<NegotiationStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: "#f1f5f9", fg: "#64748b" },
  IN_NEGOTIATION: { bg: "#fef3c7", fg: "#92400e" },
  VALIDATED: { bg: "#d1fae5", fg: "#065f46" },
  BLOCKED: { bg: "#fee2e2", fg: "#991b1b" },
  CLOSED: { bg: "#e5e7eb", fg: "#374151" },
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  PROPOSED: "Proposée",
  ACCEPTED: "Acceptée",
  REJECTED: "Rejetée",
  COUNTERED: "Contre-proposée",
};
export const PROPOSAL_STATUS_STYLE: Record<ProposalStatus, { bg: string; fg: string }> = {
  PROPOSED: { bg: "#dbeafe", fg: "#1e40af" },
  ACCEPTED: { bg: "#d1fae5", fg: "#065f46" },
  REJECTED: { bg: "#fee2e2", fg: "#991b1b" },
  COUNTERED: { bg: "#fef3c7", fg: "#92400e" },
};

export const ROLE_LABEL: Record<ParticipantRole, string> = {
  READER: "Lecture",
  COMMENTER: "Commentaire",
  PROPOSER: "Proposition",
  VALIDATOR: "Validation",
  FILLER: "Complétion",
};

export const MODE_LABEL: Record<NegotiationMode, string> = {
  NEGOTIATION: "Négociation",
  COMPLETION: "Complétion",
};
export const MODE_STYLE: Record<NegotiationMode, { bg: string; fg: string }> = {
  NEGOTIATION: { bg: "#ede9fe", fg: "#5b21b6" },
  COMPLETION: { bg: "#e0f2fe", fg: "#075985" },
};

export const FIELD_SIDE_LABEL: Record<FieldSide, string> = {
  OWNER: "Moi",
  COUNTERPARTY: "L’autre partie",
  THIRD_PARTY: "Un tiers",
};

/** Couleur d'assignation d'un champ (surlignage dans le document + légende). */
export const FIELD_SIDE_COLOR: Record<FieldSide, { dot: string; chip: string }> = {
  OWNER:        { dot: "#0284c7", chip: "#e0f2fe" }, // sky
  COUNTERPARTY: { dot: "#059669", chip: "#d1fae5" }, // emerald
  THIRD_PARTY:  { dot: "#7c3aed", chip: "#ede9fe" }, // violet
};

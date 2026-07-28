import express from "express"
import type { Request, Response, Router, NextFunction } from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { NegotiationService } from "../services/negotiation/classNegotiation.js"
import { enterNegotiation, abortNegotiation, exitToSignature } from "../services/negotiation/stateMachine.js"
import {
  enterCompletion, saveGuestFields, completeByGuest, listForOwner,
} from "../services/negotiation/completion.js"
import type { CompletionFieldInput } from "../services/negotiation/completion.js"
import { sendGuestInvite } from "../services/negotiation/mail.js"
import type {
  ProposalStatusValue, CommentVisibilityValue, ParticipantSideValue, ParticipantRoleValue,
} from "../services/negotiation/classNegotiation.js"

const router: Router = express.Router()
const svc = new NegotiationService()

const EDITOR_ROLES = new Set(["ADMIN", "JURISTE", "USER"])
function requireEditor(req: Request, res: Response, next: NextFunction) {
  if (!EDITOR_ROLES.has(String(req.role))) {
    return res.status(403).json({ success: false, message: "Action réservée aux éditeurs (juriste/admin)." })
  }
  next()
}

// ─── Routes PUBLIQUES invité (sans auth — le token est le secret) ──────────────
// Placées AVANT les routes `/:externalId` pour ne pas être capturées par elles.

router.get("/public/:token", async (req: Request, res: Response) => {
  const data = await svc.getByGuestToken(req.params["token"] as string)
  if (!data) return res.status(404).json({ success: false, message: "Lien invalide ou expiré." })
  return res.json({ success: true, data })
})

router.post("/public/:token/comments", async (req: Request, res: Response) => {
  const { body, clauseRef, anchorStart, anchorEnd, quote, proposedText } = req.body as {
    body?: string; clauseRef?: string | null; anchorStart?: number; anchorEnd?: number; quote?: string; proposedText?: string
  }
  if (!body || !body.trim()) return res.status(400).json({ success: false, message: "Commentaire vide." })
  const r = await svc.addGuestComment(req.params["token"] as string, {
    body, clauseRef: clauseRef ?? null,
    anchorStart: anchorStart ?? null, anchorEnd: anchorEnd ?? null, quote: quote ?? null, proposedText: proposedText ?? null,
  })
  if (!r) return res.status(404).json({ success: false, message: "Lien invalide ou expiré." })
  if ("forbidden" in r) return res.status(403).json({ success: false, message: "Votre rôle ne permet pas de commenter (lecture seule)." })
  return res.status(201).json({ success: true, data: r })
})

// Complétion guidée : enregistrement (partiel autorisé) des champs de l'invité.
router.patch("/public/:token/fields", async (req: Request, res: Response) => {
  const { values } = req.body as { values?: Record<string, string> }
  if (!values || typeof values !== "object") {
    return res.status(400).json({ success: false, message: "values requis (objet champExternalId → valeur)." })
  }
  const r = await saveGuestFields(req.params["token"] as string, values)
  if (!r) return res.status(404).json({ success: false, message: "Lien invalide, expiré ou hors mode complétion." })
  return res.json({ success: true, data: r })
})

// Complétion guidée : l'invité déclare avoir terminé → contrôle des champs
// requis, interpolation du texte et validation si toutes les parties ont fini.
router.post("/public/:token/complete", async (req: Request, res: Response) => {
  const r = await completeByGuest(req.params["token"] as string)
  if (!r) return res.status(404).json({ success: false, message: "Lien invalide, expiré ou hors mode complétion." })
  if (!r.done) return res.status(422).json({ success: false, message: "Des champs requis sont vides.", data: r })
  return res.json({ success: true, data: r })
})

// ─── Entrée du tunnel & liste ──────────────────────────────────────────────────

// Page « Mes négociations » : toutes les sessions de l'utilisateur.
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  const data = await listForOwner(Number(req.idUser))
  return res.json({ success: true, data })
})

router.post("/enter", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { contractExternalId, title } = req.body as { contractExternalId?: string; title?: string }
  if (!contractExternalId) return res.status(400).json({ success: false, message: "contractExternalId requis." })
  const r = await enterNegotiation(contractExternalId, Number(req.idUser), title)
  if (!r) return res.status(500).json({ success: false, message: "Impossible d'ouvrir la négociation." })
  // Normalise vers `id` pour cohérence avec le reste de l'API.
  return res.status(201).json({ success: true, data: { id: r.externalId, status: r.status } })
})

// Complétion guidée : texte avec marqueurs {{variableId}} + champs assignés.
router.post("/enter-completion", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { contractExternalId, title, contentText, fields, autoToSignature } = req.body as {
    contractExternalId?: string; title?: string; contentText?: string
    fields?: CompletionFieldInput[]; autoToSignature?: boolean
  }
  if (!contractExternalId || !contentText || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ success: false, message: "contractExternalId, contentText et fields requis." })
  }
  const r = await enterCompletion({
    contractExternalId, ownerUserId: Number(req.idUser),
    title, contentText, fields, autoToSignature: Boolean(autoToSignature),
  })
  if (!r) return res.status(500).json({ success: false, message: "Impossible d'ouvrir la complétion." })
  return res.status(201).json({ success: true, data: { id: r.externalId } })
})

router.get("/contract/:contractExternalId", authMiddleware, async (req: Request, res: Response) => {
  const data = await svc.listForContract(req.params["contractExternalId"] as string)
  return res.json({ success: true, data })
})

// ─── Détail & transitions ────────────────────────────────────────────────────

router.get("/:externalId", authMiddleware, async (req: Request, res: Response) => {
  const data = await svc.get(req.params["externalId"] as string)
  if (!data) return res.status(404).json({ success: false, message: "Négociation introuvable." })
  return res.json({ success: true, data })
})

router.post("/:externalId/abort", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const ok = await abortNegotiation(req.params["externalId"] as string, Number(req.idUser))
  return res.json({ success: ok })
})

router.post("/:externalId/exit", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const r = await exitToSignature(req.params["externalId"] as string)
  if (!r) return res.status(409).json({ success: false, message: "Aucune version validée à transmettre à la signature." })
  return res.json({ success: true, data: r })
})

// ─── Versions ──────────────────────────────────────────────────────────────────

router.post("/:externalId/versions", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { contentText, label, structuredJson } = req.body as { contentText?: string; label?: string; structuredJson?: unknown }
  if (!contentText) return res.status(400).json({ success: false, message: "contentText requis." })
  const r = await svc.createVersion(req.params["externalId"] as string, { contentText, label, structuredJson, createdById: Number(req.idUser) })
  if (!r) return res.status(404).json({ success: false, message: "Négociation introuvable." })
  return res.status(201).json({ success: true, data: r })
})

router.post("/:externalId/versions/:versionExternalId/validate", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const r = await svc.validateVersion(req.params["externalId"] as string, req.params["versionExternalId"] as string, Number(req.idUser))
  if (!r) return res.status(404).json({ success: false, message: "Version ou négociation introuvable." })
  return res.json({ success: true, data: r })
})

// ─── Propositions / redlines ───────────────────────────────────────────────────

router.post("/:externalId/proposals", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { clauseRef, proposedText, originalText, type } = req.body as { clauseRef?: string; proposedText?: string; originalText?: string; type?: string }
  if (!clauseRef || !proposedText) return res.status(400).json({ success: false, message: "clauseRef et proposedText requis." })
  const r = await svc.addProposal(req.params["externalId"] as string, { clauseRef, proposedText, originalText, type, createdById: Number(req.idUser) })
  if (!r) return res.status(404).json({ success: false, message: "Négociation introuvable." })
  return res.status(201).json({ success: true, data: r })
})

router.patch("/:externalId/proposals/:proposalExternalId", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string }
  const valid = new Set(["PROPOSED", "ACCEPTED", "REJECTED", "COUNTERED"])
  if (!status || !valid.has(status)) return res.status(400).json({ success: false, message: "Statut invalide." })
  const ok = await svc.setProposalStatus(req.params["externalId"] as string, req.params["proposalExternalId"] as string, status as ProposalStatusValue, Number(req.idUser))
  return res.json({ success: ok })
})

// ─── Commentaires ────────────────────────────────────────────────────────────

router.post("/:externalId/comments", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { body, clauseRef, visibility, parentCommentId, anchorStart, anchorEnd, quote, proposedText } = req.body as {
    body?: string; clauseRef?: string; visibility?: string; parentCommentId?: number;
    anchorStart?: number; anchorEnd?: number; quote?: string; proposedText?: string
  }
  if (!body || !body.trim()) return res.status(400).json({ success: false, message: "Commentaire vide." })
  const r = await svc.addComment(req.params["externalId"] as string, {
    body, clauseRef: clauseRef ?? null,
    visibility: (visibility === "EXTERNAL" ? "EXTERNAL" : "INTERNAL") as CommentVisibilityValue,
    parentCommentId: parentCommentId ?? null, createdById: Number(req.idUser),
    anchorStart: anchorStart ?? null, anchorEnd: anchorEnd ?? null, quote: quote ?? null, proposedText: proposedText ?? null,
  })
  if (!r) return res.status(404).json({ success: false, message: "Négociation introuvable." })
  return res.status(201).json({ success: true, data: r })
})

router.patch("/:externalId/comments/:commentId/resolve", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { resolved } = req.body as { resolved?: boolean }
  const ok = await svc.resolveComment(req.params["externalId"] as string, req.params["commentId"] as string, resolved !== false)
  return res.json({ success: ok })
})

// ─── Participants ──────────────────────────────────────────────────────────────

router.post("/:externalId/participants", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { side, role, userId, name, email } = req.body as { side?: string; role?: string; userId?: number; name?: string; email?: string }
  const validSide = new Set(["INTERNAL", "EXTERNAL"])
  const validRole = new Set(["READER", "COMMENTER", "PROPOSER", "VALIDATOR"])
  if (!side || !validSide.has(side) || !role || !validRole.has(role)) {
    return res.status(400).json({ success: false, message: "side et role valides requis." })
  }
  const r = await svc.addParticipant(req.params["externalId"] as string, {
    side: side as ParticipantSideValue, role: role as ParticipantRoleValue,
    userId: userId ?? null, name: name ?? null, email: email ?? null,
  })
  if (!r) return res.status(404).json({ success: false, message: "Négociation introuvable." })
  return res.status(201).json({ success: true, data: r })
})

router.delete("/:externalId/participants/:participantExternalId", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const ok = await svc.removeParticipant(req.params["externalId"] as string, req.params["participantExternalId"] as string)
  return res.json({ success: ok })
})

// ─── Partage externe (lien invité) ──────────────────────────────────────────────

router.post("/:externalId/guests", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const { participantExternalId, ttlHours, name, email, role, fillSide, sendEmail } = req.body as {
    participantExternalId?: string; ttlHours?: number
    name?: string; email?: string; role?: string
    fillSide?: "COUNTERPARTY" | "THIRD_PARTY"; sendEmail?: boolean
  }
  const externalId = req.params["externalId"] as string
  const r = await svc.inviteGuest(externalId, {
    participantExternalId: participantExternalId ?? null, ttlHours,
    name: name?.trim() || null, email: email?.trim() || null,
    role: role as ParticipantRoleValue | "FILLER" | undefined,
    fillSide: fillSide ?? null,
  })
  if (!r) return res.status(404).json({ success: false, message: "Négociation introuvable." })
  // Envoi d'e-mail best-effort : le lien reste copiable même si le SMTP échoue.
  let emailSent = false
  if (sendEmail !== false && r.email) {
    const detail = await svc.get(externalId)
    emailSent = await sendGuestInvite({
      to: r.email, guestName: r.name ?? null,
      documentTitle: detail?.title ?? "Document Lumen Juris",
      token: r.token, mode: (detail?.mode as "NEGOTIATION" | "COMPLETION") ?? "NEGOTIATION",
    })
    if (emailSent) await svc.markGuestSent(externalId, r.id)
  }
  return res.status(201).json({ success: true, data: { ...r, emailSent } })
})

// Relance : renvoie l'e-mail d'invitation à un invité dont le lien est actif.
router.post("/:externalId/guests/:guestExternalId/remind", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const externalId = req.params["externalId"] as string
  const g = await svc.markGuestSent(externalId, req.params["guestExternalId"] as string)
  if (!g) return res.status(404).json({ success: false, message: "Lien introuvable, expiré ou révoqué." })
  if (!g.email) return res.status(422).json({ success: false, message: "Ce lien n'a pas de destinataire e-mail." })
  const detail = await svc.get(externalId)
  const sent = await sendGuestInvite({
    to: g.email, guestName: g.name ?? null,
    documentTitle: detail?.title ?? "Document Lumen Juris",
    token: g.token, mode: (detail?.mode as "NEGOTIATION" | "COMPLETION") ?? "NEGOTIATION",
    reminder: true,
  })
  return res.json({ success: true, data: { emailSent: sent } })
})

router.post("/:externalId/guests/:guestExternalId/revoke", authMiddleware, requireEditor, async (req: Request, res: Response) => {
  const ok = await svc.revokeGuest(req.params["externalId"] as string, req.params["guestExternalId"] as string)
  return res.json({ success: ok })
})

export default router

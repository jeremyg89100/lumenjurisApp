// E-mails du module Négociation (invitation, relance, notification de fin).
//
// Module autonome : il n'importe pas la classe Mailer (qui expose des envois
// privés) mais réutilise la même configuration SMTP. Tous les envois sont
// best-effort : un échec d'e-mail ne doit jamais faire échouer l'opération
// métier — le lien reste copiable depuis l'interface.
import nodemailer from "nodemailer"
import { prisma } from "../../../prisma/singletonPrisma.js"

const transporter = nodemailer.createTransport({
  host: "mail.lumenjuris.com",
  port: 465,
  secure: true,
  pool: true,
  maxConnections: 3,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
  auth: {
    user: process.env.MAILER_USER_O2S,
    pass: process.env.MAILER_PASS_O2S,
  },
})

function frontUrl(): string {
  return process.env["HOST_FRONT"] ?? "http://localhost:5173"
}

export function guestLink(token: string): string {
  return `${frontUrl()}/negociation-invite/${token}`
}

/** Gabarit visuel commun (bandeau marque + carte blanche + pied conformité). */
function wrap(inner: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F6FB;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr>
          <td style="background:#0B1F3A;padding:22px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:19px;">
            <span style="font-weight:700;color:#FFFFFF;">Lumen</span><span style="font-weight:400;color:#9CB8E8;"> Juris</span>
          </td>
        </tr>
        ${inner}
        <tr>
          <td style="padding:20px 32px 26px;border-top:1px solid #F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#94A3B8;">
            Lien personnel, à ne pas transférer. Connexion chiffrée, document hébergé en France.
            Si vous n'êtes pas le destinataire de ce message, vous pouvez l'ignorer.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>`
}

function button(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="border-radius:8px;background:#1B2A4A;">
      <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${label}
      </a>
    </td>
  </tr></table>`
}

function bodyCell(html: string): string {
  return `<tr><td style="padding:30px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#334155;">${html}</td></tr>`
}

async function safeSend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    if (!process.env.MAILER_USER_O2S || !process.env.MAILER_PASS_O2S) return false
    const r = await transporter.sendMail({
      from: '"Lumen Juris" <no-reply@lumenjuris.com>',
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    })
    return Boolean(r.messageId)
  } catch (e) {
    console.error("[negotiation:mail] envoi impossible :", (e as Error).message)
    return false
  }
}

/** Invitation (ou relance) d'un invité, selon le mode de la session. */
export async function sendGuestInvite(opts: {
  to: string
  guestName: string | null
  documentTitle: string
  token: string
  mode: "NEGOTIATION" | "COMPLETION"
  reminder?: boolean
}): Promise<boolean> {
  const hello = opts.guestName ? `Bonjour <strong>${opts.guestName}</strong>,` : "Bonjour,"
  const intro = opts.mode === "COMPLETION"
    ? `vous êtes invité·e à <strong>compléter les informations qui vous concernent</strong> dans le document
       «&nbsp;<strong>${opts.documentTitle}</strong>&nbsp;», puis à le valider en vue de sa signature.
       Seuls les champs qui vous sont assignés sont modifiables&nbsp;: le reste du document est en lecture seule.`
    : `vous êtes invité·e à <strong>relire et commenter</strong> le document
       «&nbsp;<strong>${opts.documentTitle}</strong>&nbsp;». Vous pouvez surligner un passage pour le commenter
       ou proposer une reformulation&nbsp;; votre interlocuteur en sera informé.`
  const subject = opts.reminder
    ? `Rappel — ${opts.mode === "COMPLETION" ? "informations à compléter" : "relecture attendue"} : ${opts.documentTitle}`
    : opts.mode === "COMPLETION"
      ? `Informations à compléter : ${opts.documentTitle}`
      : `Invitation à relire : ${opts.documentTitle}`
  const html = wrap(
    bodyCell(`
      <p style="margin:0 0 14px;">${hello}</p>
      <p style="margin:0 0 22px;">${opts.reminder ? "Petit rappel : " : ""}${intro}</p>`)
    + `<tr><td style="padding:4px 32px 30px;">${button(guestLink(opts.token), opts.mode === "COMPLETION" ? "Compléter le document →" : "Ouvrir le document →")}</td></tr>`,
  )
  return safeSend(opts.to, subject, html)
}

/** Notifie le propriétaire que l'invité a terminé la complétion. */
export async function notifyOwnerCompletionFinished(opts: {
  ownerUserId: number
  documentTitle: string
  negotiationExternalId: string
  guestName: string | null
  autoToSignature: boolean
}): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { idUser: opts.ownerUserId },
      select: { email: true, prenom: true },
    })
    if (!user?.email) return false
    const who = opts.guestName ? `<strong>${opts.guestName}</strong>` : "L'autre partie"
    const next = opts.autoToSignature
      ? "Vous pouvez lancer la signature en un clic depuis l'espace de suivi."
      : "Vérifiez les informations saisies, puis envoyez le document en signature."
    const html = wrap(
      bodyCell(`
        <p style="margin:0 0 14px;">Bonjour${user.prenom ? ` <strong>${user.prenom}</strong>` : ""},</p>
        <p style="margin:0 0 22px;">${who} a terminé de compléter le document
        «&nbsp;<strong>${opts.documentTitle}</strong>&nbsp;». ${next}</p>`)
      + `<tr><td style="padding:4px 32px 30px;">${button(`${frontUrl()}/negociation/${opts.negotiationExternalId}`, "Voir le document complété →")}</td></tr>`,
    )
    return safeSend(user.email, `Document complété : ${opts.documentTitle}`, html)
  } catch (e) {
    console.error("[negotiation:mail] notification propriétaire impossible :", (e as Error).message)
    return false
  }
}

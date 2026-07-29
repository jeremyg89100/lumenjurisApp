import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma/singletonPrisma.js";

/**
 * Réserve l'accès aux administrateurs.
 *
 * Le rôle est vérifié EN BASE (et non depuis le token JWT / le header
 * x-user-role) : un changement de rôle prend effet immédiatement, sans
 * attendre une reconnexion, et un token périmé ne peut pas servir à une
 * élévation de privilèges.
 *
 * À placer APRÈS authMiddleware (qui renseigne req.idUser).
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { idUser: Number(req.idUser) },
      select: { role: true },
    });
    if (!user || user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Action réservée aux administrateurs." });
    }
    next();
  } catch (err) {
    console.error("[requireAdmin] error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

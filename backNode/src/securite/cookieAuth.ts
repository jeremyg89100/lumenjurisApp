import jwt from "jsonwebtoken";
import { Response } from "express";

export function createCookieAuth(idUser: number, role: string, res: Response) {
  const jwtSigned = jwt.sign(
    {
      userId: idUser,
      role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  return res.cookie("authLumenJuris", jwtSigned, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    //sameSite: "strict",
    // En prod, COOKIE_DOMAIN=.lumenjuris.com pour partager le cookie entre
    // les sous-domaines (proxy, backNode, front). Vide en dev => cookie
    // rattaché au host courant (localhost), comportement inchangé.
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
  });
}

import { Router } from "express"
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import { relayToNode } from "../relay.js";
const adminRouter : Router = Router()


// ─── Administration (gestion des utilisateurs & rôles) ───
adminRouter.get("/api/admin/users", auth, (req, res) => relayToNode(req, res, "/admin/users"));

adminRouter.patch("/api/admin/users/:idUser/role", auth, (req, res) => relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/role`));

adminRouter.get("/api/admin/revenue", auth, (req, res) => relayToNode(req, res, "/admin/revenue"));

adminRouter.get("/api/admin/users/:idUser/details", auth, (req, res) => relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/details`));

adminRouter.patch("/api/admin/users/:idUser/ban", auth, (req, res) => relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/ban`));

adminRouter.get("/api/admin/feature-usage", auth, (req, res) => relayToNode(req, res, `/admin/feature-usage${req.query.days ? `?days=${encodeURIComponent(req.query.days as string)}` : ""}`));

adminRouter.get("/api/admin/feature-usage/users/:idUser", auth, (req, res) => relayToNode(req, res, `/admin/feature-usage/users/${encodeURIComponent(req.params.idUser as string)}${req.query.days ? `?days=${encodeURIComponent(req.query.days as string)}` : ""}`));

adminRouter.get("/api/admin/overview", auth, (req, res) => relayToNode(req, res, "/admin/overview"));

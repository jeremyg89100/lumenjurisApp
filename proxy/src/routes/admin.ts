import { Router } from "express"
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import { relayToNode } from "../relay.js";





export const adminRouter: Router = Router()


// ─── Administration (gestion des utilisateurs & rôles) ───
adminRouter.get("/users", auth, (req, res) =>
    relayToNode(req, res, "/admin/users")
);

adminRouter.patch("/users/:idUser/role", auth, (req, res) =>
    relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/role`)
);

adminRouter.get("/revenue", auth, (req, res) =>
    relayToNode(req, res, "/admin/revenue")
);

adminRouter.get("/users/:idUser/details", auth, (req, res) =>
    relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/details`)
);

adminRouter.patch("/users/:idUser/ban", auth, (req, res) =>
    relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/ban`)
);

adminRouter.get("/feature-usage", auth, (req, res) =>
    relayToNode(req, res, `/admin/feature-usage${req.query.days
        ? `?days=${encodeURIComponent(req.query.days as string)}`
        : ""}`)
);

adminRouter.get("/feature-usage/users/:idUser", auth, (req, res) =>
    relayToNode(req, res, `/admin/feature-usage/users/${encodeURIComponent(req.params.idUser as string)}${req.query.days
        ? `?days=${encodeURIComponent(req.query.days as string)}`
        : ""}`)
);

adminRouter.get("/overview", auth, (req, res) =>
    relayToNode(req, res, "/admin/overview")
);

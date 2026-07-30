import { Router } from "express"
import { relayToNode } from "../relay.js";
import { relayJsonToPython } from "../relay.js";
import { trackFeature } from "../tracking.js";
import { proxyAuthMiddleware } from "../middleware/authMiddleware.js";


export const negotiationRouter: Router = Router()
const auth = proxyAuthMiddleware;


// ─── Négociation (module isolé) ───
// Publiques invité (sans auth — token = secret) ; placées AVANT /:externalId.
negotiationRouter.get("/public/:token", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}`,
    ),
);
negotiationRouter.post("/public/:token/comments", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}/comments`,
    ),
);

// Complétion guidée (invité) : saisie des champs et validation finale.
negotiationRouter.patch("/public/:token/fields", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}/fields`,
    ),
);
negotiationRouter.post("/public/:token/complete", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}/complete`,
    ),
);
// Entrée & liste
negotiationRouter.get("/", auth, (req, res) =>
    relayToNode(req, res, "/negotiation/"),
);
negotiationRouter.post("/enter", auth, (req, res) => {
    void trackFeature("negotiation", res.locals.userId as number | undefined);
    relayToNode(req, res, "/negotiation/enter");
});
negotiationRouter.post("/enter-completion", auth, (req, res) => {
    void trackFeature("negotiation", res.locals.userId as number | undefined);
    relayToNode(req, res, "/negotiation/enter-completion");
});
negotiationRouter.get("/contract/:contractExternalId", auth, (req, res) => relayToNode(req, res, `/negotiation/contract/${encodeURIComponent(req.params.contractExternalId as string)}`));
// Sous-ressources (avant /:externalId nu)
negotiationRouter.post("/:externalId/abort", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/abort`,
    ),
);
negotiationRouter.post("/:externalId/exit", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/exit`,
    ),
);
negotiationRouter.post(
    "/:externalId/versions/:versionExternalId/validate",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/versions/${encodeURIComponent(req.params.versionExternalId as string)}/validate`,
        ),
);
negotiationRouter.post("/:externalId/versions", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/versions`,
    ),
);
negotiationRouter.post("/:externalId/proposals", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/proposals`,
    ),
);
negotiationRouter.patch(
    "/:externalId/proposals/:proposalExternalId",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/proposals/${encodeURIComponent(req.params.proposalExternalId as string)}`,
        ),
);
negotiationRouter.patch(
    "/:externalId/comments/:commentId/resolve",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/comments/${encodeURIComponent(req.params.commentId as string)}/resolve`,
        ),
);
negotiationRouter.post("/:externalId/comments", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/comments`,
    ),
);
negotiationRouter.post("/:externalId/participants", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/participants`,
    ),
);
negotiationRouter.delete(
    "/:externalId/participants/:participantExternalId",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/participants/${encodeURIComponent(req.params.participantExternalId as string)}`,
        ),
);
negotiationRouter.post(
    "/:externalId/guests/:guestExternalId/revoke",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests/${encodeURIComponent(req.params.guestExternalId as string)}/revoke`,
        ),
);
negotiationRouter.post("/:externalId/guests/:guestExternalId/remind", auth, (req, res) =>
    relayToNode(req, res, `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests/${encodeURIComponent(req.params.guestExternalId as string)}/remind`)
);

negotiationRouter.post("/:externalId/guests", auth, (req, res) =>
    relayToNode(req, res, `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests`),
);

negotiationRouter.get("/:externalId", auth, (req, res) =>
    relayToNode(req, res, `/negotiation/${encodeURIComponent(req.params.externalId as string)}`,)
);


// Diff structuré délégué au microservice Python.
negotiationRouter.post("/negotiation-diff", auth, (req, res) =>
    relayJsonToPython(req, res, "/negotiation-diff"),
);



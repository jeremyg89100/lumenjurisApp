import { Router } from "express"
import { relayToNode } from "../relay.js";
import { relayJsonToPython } from "../relay.js";
import { trackFeature } from "../tracking.js";
import { proxyAuthMiddleware } from "../middleware/authMiddleware.js";


export const negociationRouter : Router = Router()
const auth = proxyAuthMiddleware;


// ─── Négociation (module isolé) ───
// Publiques invité (sans auth — token = secret) ; placées AVANT /:externalId.
negociationRouter.get("/public/:token", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}`,
    ),
);
negociationRouter.post("/api/ne/:token/comments", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}/comments`,
    ),
);
// Complétion guidée (invité) : saisie des champs et validation finale.
negociationRouter.patch("/public/:token/fields", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}/fields`,
    ),
);
negociationRouter.post("/public/:token/complete", (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/public/${encodeURIComponent(req.params.token as string)}/complete`,
    ),
);
// Entrée & liste
negociationRouter.get("/", auth, (req, res) =>
    relayToNode(req, res, "/negotiation/"),
);
negociationRouter.post("/enter", auth, (req, res) => {
    void trackFeature("negotiation", res.locals.userId as number | undefined);
    relayToNode(req, res, "/negotiation/enter");
});
negociationRouter.post("/enter-completion", auth, (req, res) => {
    void trackFeature("negotiation", res.locals.userId as number | undefined);
    relayToNode(req, res, "/negotiation/enter-completion");
});
negociationRouter.get("/contract/:contractExternalId", auth, (req, res) => relayToNode(req, res, `/negotiation/contract/${encodeURIComponent(req.params.contractExternalId as string)}`));
// Sous-ressources (avant /:externalId nu)
negociationRouter.post("/:externalId/abort", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/abort`,
    ),
);
negociationRouter.post("/:externalId/exit", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/exit`,
    ),
);
negociationRouter.post(
    "/:externalId/versions/:versionExternalId/validate",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/versions/${encodeURIComponent(req.params.versionExternalId as string)}/validate`,
        ),
);
negociationRouter.post("/:externalId/versions", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/versions`,
    ),
);
negociationRouter.post("/:externalId/proposals", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/proposals`,
    ),
);
negociationRouter.patch(
    "/:externalId/proposals/:proposalExternalId",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/proposals/${encodeURIComponent(req.params.proposalExternalId as string)}`,
        ),
);
negociationRouter.patch(
    "/:externalId/comments/:commentId/resolve",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/comments/${encodeURIComponent(req.params.commentId as string)}/resolve`,
        ),
);
negociationRouter.post("/:externalId/comments", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/comments`,
    ),
);
negociationRouter.post("/:externalId/participants", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/participants`,
    ),
);
negociationRouter.delete(
    "/:externalId/participants/:participantExternalId",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/participants/${encodeURIComponent(req.params.participantExternalId as string)}`,
        ),
);
negociationRouter.post(
    "/:externalId/guests/:guestExternalId/revoke",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests/${encodeURIComponent(req.params.guestExternalId as string)}/revoke`,
        ),
);
negociationRouter.post(
    "/:externalId/guests/:guestExternalId/remind",
    auth,
    (req, res) =>
        relayToNode(
            req,
            res,
            `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests/${encodeURIComponent(req.params.guestExternalId as string)}/remind`,
        ),
);
negociationRouter.post("/:externalId/guests", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests`,
    ),
);
negociationRouter.get("/:externalId", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/negotiation/${encodeURIComponent(req.params.externalId as string)}`,
    ),
);
// Diff structuré délégué au microservice Python.
negociationRouter.post("/negotiation-diff", auth, (req, res) =>
    relayJsonToPython(req, res, "/negotiation-diff"),
);



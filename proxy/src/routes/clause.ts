import { Router } from "express";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import { relayToNode, withQuery } from "../relay.js";
import { trackFeature } from "../tracking.js";

// Monté sur "/api/clause" — chemins relatifs.
// (withQuery lit req.originalUrl : insensible au point de montage.)
export const clauseRouter: Router = Router();

clauseRouter.get("/stats", auth, (req, res) =>
  relayToNode(req, res, "/clause/stats"),
);

clauseRouter.get("/", auth, (req, res) =>
  relayToNode(req, res, withQuery("/clause", req)),
);

clauseRouter.post("/", auth, (req, res) => {
  void trackFeature("clause_library", res.locals.userId as number | undefined);
  relayToNode(req, res, "/clause");
});

clauseRouter.post("/:externalId/use", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/clause/${encodeURIComponent(req.params.externalId as string)}/use`,
  ),
);

clauseRouter.get("/:externalId", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/clause/${encodeURIComponent(req.params.externalId as string)}`,
  ),
);

clauseRouter.patch("/:externalId", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/clause/${encodeURIComponent(req.params.externalId as string)}`,
  ),
);

clauseRouter.delete("/:externalId", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/clause/${encodeURIComponent(req.params.externalId as string)}`,
  ),
);

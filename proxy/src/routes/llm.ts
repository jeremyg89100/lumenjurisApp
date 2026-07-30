import { Router } from "express";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import { relayToNode } from "../relay.js";

// Monté sur "/api/llm" — chemins relatifs.
export const llmRouter: Router = Router();

llmRouter.get("/usage", auth, (req, res) => relayToNode(req, res, "/llm/usage"));

llmRouter.get("/usage/history", auth, (req, res) => {
  // Transmet le query param ?days= tel quel au backNode
  const days = req.query.days ? `?days=${req.query.days}` : "";
  relayToNode(req, res, `/llm/usage/history${days}`);
});


llmRouter.get("/usage/users", auth, (req, res) =>
  relayToNode(req, res, "/llm/usage/users"),
);


/* llmRouter.get("/usage/me", auth, (req, res) =>
  relayToNode(req, res, "/llm/usage/me"),
); */

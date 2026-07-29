import { Router } from "express"
import { relayToNode, relayJsonToPython } from "../relay.js";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";

export const veilleRouter : Router = Router()


veilleRouter.get("/", auth, (req, res) => {
  const qs = req.query.nocache === "1" ? "?nocache=1" : "";
  relayToNode(req, res, `/veille${qs}`);
});


veilleRouter.get("/debug", auth, (req, res) => {
  relayToNode(req, res, "/veille/debug");
});

veilleRouter.post("classify-veille", auth, (req, res) => {
  relayJsonToPython(req, res, "/classify-veille");
});
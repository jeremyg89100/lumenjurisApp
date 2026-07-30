import { Router, type Request } from "express";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import {
    relayToNode,
    withQuery,
} from "../relay.js";
import { trackFeature } from "../tracking.js";


export const legalWatchRouter = Router()


// ─── Veille juridique (alertes + digest jurisprudence) ───
// Jobs du pipeline (rôle vérifié côté backNode) — l'enrichissement consomme du LLM, on le track
legalWatchRouter.post("/ingest", auth, (req, res) => relayToNode(req, res, "/legal-watch/ingest"));

legalWatchRouter.post("/enrich", auth, (req, res) => {
    void trackFeature("legal_watch_run", res.locals.userId as number | undefined);
    relayToNode(req, res, "/legal-watch/enrich");
});

legalWatchRouter.post("/publish", auth, (req, res) => relayToNode(req, res, "/legal-watch/publish"));

legalWatchRouter.post("/run", auth, (req, res) => {
    void trackFeature("legal_watch_run", res.locals.userId as number | undefined);
    relayToNode(req, res, "/legal-watch/run");
});


// Consultation — la lecture du digest est l'usage utilisateur de la veille
// (unread-count est appelé automatiquement par le header : non tracké pour ne pas fausser les stats)
legalWatchRouter.get("/alerts", auth, (req, res) => relayToNode(req, res, withQuery("/legal-watch/alerts", req)));

legalWatchRouter.patch("/alerts/:externalId", auth, (req, res) => relayToNode(req, res, `/legal-watch/alerts/${encodeURIComponent(req.params.externalId as string)}`));

legalWatchRouter.get("/digest", auth, (req, res) => {
    void trackFeature("legal_watch", res.locals.userId as number | undefined);
    relayToNode(req, res, withQuery("/legal-watch/digest", req));
});
legalWatchRouter.get("/unread-count", auth, (req, res) => relayToNode(req, res, "/legal-watch/unread-count"));

legalWatchRouter.get("/status", auth, (req, res) => relayToNode(req, res, "/legal-watch/status"));

legalWatchRouter.get("/config", auth, (req, res) => relayToNode(req, res, "/legal-watch/config"));

legalWatchRouter.patch("/sources/:name", auth, (req, res) => relayToNode(req, res, `/legal-watch/sources/${encodeURIComponent(req.params.name as string)}`));

legalWatchRouter.patch("/concepts/:concept", auth, (req, res) => relayToNode(req, res, `/legal-watch/concepts/${encodeURIComponent(req.params.concept as string)}`));

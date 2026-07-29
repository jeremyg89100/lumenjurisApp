import { Router } from "express"
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import { relayJsonToPython } from "../relay.js";
import { trackFeature } from "../tracking.js";
import { fetchLegalTexts } from "../utils/fetchLegalTexts.js";
import { detectLegalReferences } from "../utils/detectLegalReferences.js";
import { summarizeCaseInline } from "../utils/aiSummarizer.js";
import { JurisprudenceCase } from "../utils/aiSummarizer.js";


export const legalTextRouter: Router = Router()


// JSON routes — body déjà parsé par express.json
legalTextRouter.post("/legifrance-search",  auth, (req, res) => {
  relayJsonToPython(req, res, "/legifrance-search");
})


legalTextRouter.post("/jurisprudence", auth, (req, res) => {
  relayJsonToPython(req, res, "/jurisprudence");
});



legalTextRouter.post("/detect-legal-references", auth, async (req, res) => {
    const { clause } = req.body as { clause?: unknown };
    if (!clause) {
        res
            .status(400)
            .json({ success: false, message: "Le champ 'clause' est requis." });
        return;
    }
    try {
        const refs = await detectLegalReferences(clause as any);
        void trackFeature(
            "detect_legal_refs",
            res.locals.userId as number | undefined,
        );
        res.json(refs);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur interne";
        console.error("detect-legal-references error:", message);
        res.status(500).json({ success: false, message });
    }
});




legalTextRouter.post("/fetch-legal-texts", auth, async (req, res) => {
    const { refs, clause } = req.body as { refs?: unknown; clause?: unknown };
    if (!refs) {
        res
            .status(400)
            .json({ success: false, message: "Le champ 'refs' est requis." });
        return;
    }
    try {
        const texts = await fetchLegalTexts(refs as any, clause as any);
        res.json(texts);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur interne";
        console.error("fetch-legal-texts error:", message);
        res.status(500).json({ success: false, message });
    }
});




legalTextRouter.post("/summarize-case", auth, async(req, res) => {
    const { item } = req.body as { item?: unknown };
    if (!item) {
        res
            .status(400)
            .json({ success: false, message: "Le champ 'item' est requis." });
        return;
    }
    try {
        const summary = await summarizeCaseInline(item as JurisprudenceCase);
        void trackFeature(
            "summarize_case",
            res.locals.userId as number | undefined,
        );
        res.json({ summary });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur interne";
        console.error("summarize-case error:", message);
        res.status(500).json({ success: false, message });
    }
});
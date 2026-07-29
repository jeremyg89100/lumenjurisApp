import { Router } from "express"
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import type { MarketAnalysisResult } from "../utils/marketAnalysis.js";
import { performCompleteMarketAnalysis } from "../utils/marketAnalysis.js";
import { trackFeature } from "../tracking.js";
import { getRecommendedClauses } from "../utils/recommendClause.js";
import { detectContractWithAI } from "../utils/contractDetector.js";
import { AnalysisContext } from "../services/aiAnalyser/types.js";
import { analyzeContractWithAI } from "../services/aiAnalyser/aiAnalyzer.js";


import { relayJsonToPython } from "../relay.js";
import { withTracking } from "../tracking.js";
import { logOpenAiTokens } from "../tracking.js";


export const analyzerRouter: Router = Router()





analyzerRouter.post("/api/analyzer/analyze-clause", auth, (req, res) => {
    relayJsonToPython(req, res, "/analyze-clause", withTracking("analyze_clause", logOpenAiTokens))
});


analyzerRouter.post("/market-analysis", auth, async (req, res) => {
    const { contractText, contractType, detectedClauses } = req.body as {
        contractText?: string;
        contractType?: string;
        detectedClauses?: unknown[];
    };
    if (!contractText || !contractType) {
        res.status(400).json({
            success: false,
            message: "Les champs 'contractText' et 'contractType' sont requis.",
        });
        return;
    }
    try {
        const result: MarketAnalysisResult = await performCompleteMarketAnalysis(
            contractText,
            contractType,
            (detectedClauses ?? []) as any,
        );
        void trackFeature(
            "market_analysis",
            res.locals.userId as number | undefined,
        );
        res.json(result);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur interne";
        console.error("market-analysis error:", message);
        res.status(500).json({ success: false, message });
    }
});




analyzerRouter.post("/api/analyzer/recommend-clause", auth, async (req, res) => {
    const { clause, context, model } = req.body as {
        clause?: unknown;
        context?: unknown;
        model?: string;
    };
    if (!clause) {
        res
            .status(400)
            .json({ success: false, message: "Le champ 'clause' est requis." });
        return;
    }
    try {
        const recommendations = await getRecommendedClauses(
            clause as any,
            context as any,
            model,
        );
        void trackFeature(
            "recommend_clause",
            res.locals.userId as number | undefined,
        );
        res.json(recommendations);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur interne";
        console.error("recommend-clause error:", message);
        res.status(500).json({ success: false, message });
    }
});





analyzerRouter.post("/detect-contract", auth, async (req, res) => {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
        res
            .status(400)
            .json({ success: false, message: "Le champ 'text' est requis." });
        return;
    }
    try {
        const context = await detectContractWithAI(text);
        void trackFeature(
            "detect_contract",
            res.locals.userId as number | undefined,
        );
        res.json(context);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur interne";
        console.error("detect-contract error:", message);
        res.status(500).json({ success: false, message });
    }
});




analyzerRouter.post("/analyze-contract", auth, async (req, res) => {
    const { content, context } = req.body as {
        content?: string;
        context?: AnalysisContext;
    };
    if (!content || typeof content !== "string") {
        res
            .status(400)
            .json({ success: false, message: "Le champ 'content' est requis." });
        return;
    }
    try {
        const clauses = await analyzeContractWithAI(
            content,
            context,
            res.locals.userId as number | undefined,
        );
        const contractStructure = await detectContractWithAI(content);
        void trackFeature(
            "analyze_contract",
            res.locals.userId as number | undefined,
        );
        res.json({ success: true, clauses, contractStructure });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erreur interne";
        console.error("analyze-contract error:", message);
        res.status(500).json({ success: false, message });
    }
});

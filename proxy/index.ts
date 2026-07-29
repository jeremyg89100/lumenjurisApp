/* eslint-disable no-console */
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { proxyAuthMiddleware } from "./src/middleware/authMiddleware.js";
import { analyzeContractWithAI } from "./src/services/aiAnalyser/aiAnalyzer.js";
import type { AnalysisContext } from "./src/services/aiAnalyser/types.js";
import { detectContractWithAI } from "./src/utils/contractDetector.js";
import { performCompleteMarketAnalysis } from "./src/utils/marketAnalysis.js";
import type { MarketAnalysisResult } from "./src/utils/marketAnalysis.js";
import { getRecommendedClauses } from "./src/utils/recommendClause.js";
import { detectLegalReferences } from "./src/utils/detectLegalReferences.js";
import { fetchLegalTexts } from "./src/utils/fetchLegalTexts.js";
import { summarizeCaseInline } from "./src/utils/aiSummarizer.js";
import type { JurisprudenceCase } from "./src/utils/aiSummarizer.js";

import { PORT, BACKEND_URL, BACKNODE_URL } from "./src/config.js";
import {
  relayStreamToPython,
  relayJsonToPython,
  relayToNode,
  relayToNodeRaw,
  withQuery,
} from "./src/relay.js";
import { logOpenAiTokens, trackFeature, withTracking } from "./src/tracking.js";

import { llmRouter } from "./src/routes/llm.js";
import { billingRouter } from "./src/routes/billing.js";
import { signatureRouter } from "./src/routes/signature.js";
import { clauseRouter } from "./src/routes/clause.js";
import { templateRouter } from "./src/routes/template.js";
import { contractRouter } from "./src/routes/contract.js";

const app = express();
app.set("etag", false);

//Cors adapté pour prod
app.use(
  cors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^https:\/\/localhost:\d+$/, // complément Word (dev server HTTPS)
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^https:\/\/.*\.odns\.fr$/,
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));

// ─── Montage des routers par domaine ───
app.use("/api/llm", llmRouter);
app.use("/api/billing", billingRouter);
app.use("/api/signature-envelope", signatureRouter);
app.use("/api/clause", clauseRouter);
app.use("/api/template", templateRouter);
app.use("/api/contract", contractRouter);
function handleExtractDocumentText(req: Request, res: Response): void {
  relayStreamToPython(req, res, "/extract-document-text");
}

function handleLegifranceSearch(req: Request, res: Response): void {
  relayJsonToPython(req, res, "/legifrance-search");
}

function handleClassifyVeille(req: Request, res: Response): void {
  relayJsonToPython(req, res, "/classify-veille");
}

function handleJurisprudence(req: Request, res: Response): void {
  relayJsonToPython(req, res, "/jurisprudence");
}

function handleAnalyzeClause(req: Request, res: Response): void {
  relayJsonToPython(
    req,
    res,
    "/analyze-clause",
    withTracking("analyze_clause", logOpenAiTokens),
  );
}

function handleChat(req: Request, res: Response): void {
  relayJsonToPython(req, res, "/chat", withTracking("chat", logOpenAiTokens));
}

function handleOpenAiChat(req: Request, res: Response): void {
  relayJsonToPython(
    req,
    res,
    "/openai-chat",
    withTracking("openai_chat", logOpenAiTokens),
  );
}

function handleOpenAiChat5(req: Request, res: Response): void {
  relayJsonToPython(
    req,
    res,
    "/openai-chat-5",
    withTracking("openai_chat", logOpenAiTokens),
  );
}

function handleHuggingFaceGenerate(req: Request, res: Response): void {
  relayJsonToPython(req, res, "/huggingface-generate");
}

function handleInseeRequest(req: Request, res: Response): void | Response {
  if (typeof req.params.siren !== "string") {
    return res.status(400).json({
      success: false,
      message: "Bad request, le parsing du siren n'est pas conforme.",
    });
  }
  const siren = encodeURIComponent(req.params.siren);
  relayToNode(req, res, `/enterprise/insee/${siren}`);
}

function handleNodeUserGet(req: Request, res: Response): void {
  relayToNode(req, res, "/user/get");
}

function handleNodeUserUpdate(req: Request, res: Response): void {
  relayToNode(req, res, "/user");
}

function handleNodeLogin(req: Request, res: Response): void {
  relayToNode(req, res, "/user/auth/login");
}

function handleNodeVerifyAccount(req: Request, res: Response): void {
  relayToNode(req, res, "/user/resend-verify");
}

function handleNodeLogout(req: Request, res: Response): void {
  relayToNode(req, res, "/user/auth/logout");
}

function handleNodeUserPreferences(req: Request, res: Response): void {
  relayToNode(req, res, `/user/preferences`);
}

function handleNodeUserPreferencesUI(req: Request, res: Response): void {
  relayToNode(req, res, `/user/preferences/ui`);
}

function handleNodeUserTwoFactor(req: Request, res: Response): void {
  relayToNode(req, res, `/user/two-factor`);
}

function handleNodeUserTwoFactorVerify(req: Request, res: Response): void {
  relayToNode(req, res, `/user/two-factor/verify`);
}

function handleNodeUserExportData(req: Request, res: Response): void {
  relayToNode(req, res, `/user/export-data`);
}

function handleNodeUserConfirmDelete(req: Request, res: Response): void {
  relayToNode(req, res, `/user/confirm-delete`);
}

function handleNodeUserDeleteAccount(req: Request, res: Response): void {
  relayToNode(req, res, `/user/account`);
}

function handleNodeEnterpriseGet(req: Request, res: Response): void {
  relayToNode(req, res, "/enterprise");
}

function handleNodeEnterpriseUpdate(req: Request, res: Response): void {
  relayToNode(req, res, "/enterprise");
}

function handleNodeContractHistory(req: Request, res: Response): void {
  relayToNode(req, res, "/contract-history");
}

function handleNodeChatHistory(req: Request, res: Response): void {
  relayToNode(req, res, "/chat-history");
}

function handleNodeContractHistoryItem(req: Request, res: Response): void {
  const externalId = encodeURIComponent(req.params.externalId as string);
  relayToNode(req, res, `/contract-history/${externalId}`);
}

function handleNodeContractHistoryTouch(req: Request, res: Response): void {
  const externalId = encodeURIComponent(req.params.externalId as string);
  relayToNode(req, res, `/contract-history/${externalId}/touch`);
}

function handleSignUpUser(req: Request, res: Response): void {
  relayToNode(req, res, "/user/create");
}

function handleNodeUserForgotPassword(req: Request, res: Response): void {
  relayToNode(req, res, "/user/forgotpassword");
}

function handleNodeUserResetPassword(req: Request, res: Response): void {
  relayToNode(req, res, "/user/updatepassword");
}

function handleNodeGoogle(req: Request, res: Response): void {
  console.log("[proxy/google] redirect vers :", `${BACKNODE_URL}/auth/google`);
  console.log("[proxy/google] cookies entrants :", req.headers.cookie);
  res.redirect(`${BACKNODE_URL}/auth/google`);
}

async function handleDetectContract(
  req: Request,
  res: Response,
): Promise<void> {
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
}

async function handleMarketAnalysis(
  req: Request,
  res: Response,
): Promise<void> {
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
}

async function handleRecommendClause(
  req: Request,
  res: Response,
): Promise<void> {
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
}

async function handleDetectLegalReferences(
  req: Request,
  res: Response,
): Promise<void> {
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
}

async function handleFetchLegalTexts(
  req: Request,
  res: Response,
): Promise<void> {
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
}

async function handleSummarizeCase(req: Request, res: Response): Promise<void> {
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
}

async function handleAnalyzeContract(
  req: Request,
  res: Response,
): Promise<void> {
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
}

function handleNodeVeille(req: Request, res: Response): void {
  const qs = req.query.nocache === "1" ? "?nocache=1" : "";
  relayToNode(req, res, `/veille${qs}`);
}

function handleNodeVeilleDebug(_req: Request, res: Response): void {
  relayToNode(_req, res, "/veille/debug");
}

function handleUserUploadsGet(req: Request, res: Response): void {
  relayToNode(req, res, "/user-uploads");
}

function handleUserUploadsPost(req: Request, res: Response): void {
  relayToNode(req, res, "/user-uploads/upload");
}

function handleUserUploadsRename(req: Request, res: Response): void {
  const filename = encodeURIComponent(req.params.filename as string);
  relayToNode(req, res, `/user-uploads/${filename}`);
}

function handleUserUploadsDelete(req: Request, res: Response): void {
  const filename = encodeURIComponent(req.params.filename as string);
  relayToNode(req, res, `/user-uploads/${filename}`);
}

function handleFeedback(req: Request, res: Response): void {
  relayToNode(req, res, "/feedback");
}

async function handleUserUploadsAsset(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!res.locals.userId) {
      res.status(401).json({success: false, message: "Non autorisé"});
      return;
    }
    const filename = encodeURIComponent(req.params.filename as string);
    const r = await fetch(`${BACKNODE_URL}/userassets/${filename}`, {
      headers: {
        "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
      ...(res.locals.userId !== undefined
        ? {
            "x-user-id": String(res.locals.userId),
            "x-user-role": String(res.locals.role ?? "USER"),
          }
        : {}),
      }
    });
    if (!r.ok || !r.body) {
      res.status(r.status).end();
      return;
    }
    res.setHeader(
      "content-type",
      r.headers.get("content-type") || "image/webp",
    );
    const { Readable } = await import("stream");
    Readable.fromWeb(r.body as any).pipe(res);
  } catch {
    if (!res.headersSent) res.status(502).end();
  }
}

// Multipart (upload PDF) — stream direct, body non consommé par express.json
app.post(
  ["/extract-document-text", "/api/extract-document-text"],
  proxyAuthMiddleware,
  handleExtractDocumentText,
);

// JSON routes — body déjà parsé par express.json
app.post(
  ["/legifrance-search", "/api/legifrance-search"],
  proxyAuthMiddleware,
  handleLegifranceSearch,
);
app.post(["/jurisprudence", "/api/jurisprudence"], proxyAuthMiddleware, handleJurisprudence,);
app.post(["/classify-veille", "/api/classify-veille"],proxyAuthMiddleware, handleClassifyVeille,);
app.post(["/analyze-clause", "/api/analyze-clause"],proxyAuthMiddleware, handleAnalyzeClause,);
app.post(["/api/chat", "/chat"],proxyAuthMiddleware, handleChat,);
app.post(["/api/openai-chat", "/openai-chat"],proxyAuthMiddleware, handleOpenAiChat,);
app.post(["/api/openai-chat-5", "/openai-chat-5"],proxyAuthMiddleware, handleOpenAiChat5,);
app.post(
  ["/api/huggingface-generate", "/huggingface-generate"],
  proxyAuthMiddleware, handleHuggingFaceGenerate, 
);

// Node - Requêtes Backend
const auth = proxyAuthMiddleware;

// Routes publiques (pas d'auth requise)
app.post("/api/signup", handleSignUpUser);
app.post("/api/user/auth/login", handleNodeLogin);
app.post("/user/resend-verify", handleNodeVerifyAccount);
/**
 * Login du complément Word : mêmes identifiants que la plateforme, mais le
 * JWT est renvoyé dans le corps (l'iframe Word ne peut pas recevoir le cookie
 * httpOnly cross-site). Le token est ensuite passé en Authorization: Bearer.
 */
app.post("/api/addin/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, message: "Email et mot de passe requis." });
      return;
    }
    const r = await fetch(`${BACKNODE_URL}/user/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-internal-api-key": process.env.INTERNAL_API_KEY ?? "",
       },
      body: JSON.stringify({ email, password }),
    });
    const data = (await r.json().catch(() => ({}))) as {
      success?: boolean;
      twoFactorRequired?: boolean;
      data?: { idUser?: number; email?: string };
      message?: string;
    };
    if (!r.ok || !data.success || !data.data?.idUser) {
      res.status(401).json({
        success: false,
        message: data.message || "Identifiants invalides.",
      });
      return;
    }
    if (data.twoFactorRequired) {
      res.status(403).json({
        success: false,
        message:
          "Ce compte a la double authentification activée : utilisez un compte sans 2FA pour le complément Word (POC).",
      });
      return;
    }
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign(
      { userId: data.data.idUser, role: "USER" },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      },
    );
    res.json({
      success: true,
      token,
      user: { idUser: data.data.idUser, email: data.data.email },
    });
  } catch (error) {
    console.error("addin/login error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne lors de la connexion.",
    });
  }
});

app.post("/api/auth/forgotpassword", handleNodeUserForgotPassword);
app.post("/api/user/resetpassword", handleNodeUserResetPassword);
app.get("/auth/google", handleNodeGoogle);
app.get("/api/veille", auth, handleNodeVeille);
app.get("/api/veille/debug", auth, handleNodeVeilleDebug);
app.get("/api/user-uploads", auth, handleUserUploadsGet);
app.post("/api/user-uploads/upload", auth, handleUserUploadsPost);
app.put("/api/user-uploads/:filename", auth, handleUserUploadsRename);
app.delete("/api/user-uploads/:filename", auth, handleUserUploadsDelete);
app.get("/api/user-uploads/assets/:filename", auth, handleUserUploadsAsset);

// Routes protégées (JWT vérifié par le proxy)
app.post("/api/user/auth/logout", auth, handleNodeLogout);
app.get("/api/insee/:siren", auth, handleInseeRequest);
app.get("/api/user/get", auth, handleNodeUserGet);
app.put("/api/user", auth, handleNodeUserUpdate);
app.get("/api/user/preferences", auth, handleNodeUserPreferences);
app.put("/api/user/preferences", auth, handleNodeUserPreferences);
app.get("/api/user/preferences/ui", auth, handleNodeUserPreferencesUI);
app.put("/api/user/preferences/ui", auth, handleNodeUserPreferencesUI);
app.post("/api/user/two-factor", auth, handleNodeUserTwoFactor);
app.post("/api/user/two-factor/verify", auth, handleNodeUserTwoFactorVerify);
app.post("/api/user/export-data", auth, handleNodeUserExportData);
app.post("/api/user/confirm-delete", auth, handleNodeUserConfirmDelete);
app.post("/api/user/account", auth, handleNodeUserDeleteAccount);
app.get("/api/enterprise", auth, handleNodeEnterpriseGet);
app.put("/api/enterprise", auth, handleNodeEnterpriseUpdate);
app.get("/api/contract-history", auth, handleNodeContractHistory);
app.post("/api/contract-history", auth, handleNodeContractHistory);
app.get(
  "/api/contract-history/:externalId",
  auth,
  handleNodeContractHistoryItem,
);
app.delete(
  "/api/contract-history/:externalId",
  auth,
  handleNodeContractHistoryItem,
);
app.patch(
  "/api/contract-history/:externalId/touch",
  auth,
  handleNodeContractHistoryTouch,
);
app.get("/api/chat-history", auth, handleNodeChatHistory);
app.put("/api/chat-history", auth, handleNodeChatHistory);
app.post("/api/analyze-contract", auth, handleAnalyzeContract);
app.post("/api/detect-contract", auth, handleDetectContract);
app.post("/api/market-analysis", auth, handleMarketAnalysis);
app.post("/api/recommend-clause", auth, handleRecommendClause);
app.post("/api/detect-legal-references", auth, handleDetectLegalReferences);
app.post("/api/fetch-legal-texts", auth, handleFetchLegalTexts);
app.post("/api/summarize-case", auth, handleSummarizeCase);
app.post("/api/feedback", auth, handleFeedback);
app.get("/api/feedback", auth, handleFeedback);
app.delete("/api/feedback/bulk", auth, (req, res) =>
  relayToNode(req, res, "/feedback/bulk"),
);
app.delete("/api/feedback/:id", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/feedback/${encodeURIComponent(req.params.id as string)}`,
  ),
);

// ─── Veille juridique (alertes + digest jurisprudence) ───
// Jobs du pipeline (rôle vérifié côté backNode) — l'enrichissement consomme du LLM, on le track
app.post("/api/legal-watch/ingest", auth, (req, res) => relayToNode(req, res, "/legal-watch/ingest"));
app.post("/api/legal-watch/enrich", auth, (req, res) => {
  void trackFeature("legal_watch_run", res.locals.userId as number | undefined);
  relayToNode(req, res, "/legal-watch/enrich");
});
app.post("/api/legal-watch/publish", auth, (req, res) => relayToNode(req, res, "/legal-watch/publish"));
app.post("/api/legal-watch/run", auth, (req, res) => {
  void trackFeature("legal_watch_run", res.locals.userId as number | undefined);
  relayToNode(req, res, "/legal-watch/run");
});
// Consultation — la lecture du digest est l'usage utilisateur de la veille
// (unread-count est appelé automatiquement par le header : non tracké pour ne pas fausser les stats)
app.get("/api/legal-watch/alerts", auth, (req, res) => relayToNode(req, res, withQuery("/legal-watch/alerts", req)));
app.patch("/api/legal-watch/alerts/:externalId", auth, (req, res) => relayToNode(req, res, `/legal-watch/alerts/${encodeURIComponent(req.params.externalId as string)}`));
app.get("/api/legal-watch/digest", auth, (req, res) => {
  void trackFeature("legal_watch", res.locals.userId as number | undefined);
  relayToNode(req, res, withQuery("/legal-watch/digest", req));
});
app.get("/api/legal-watch/unread-count", auth, (req, res) => relayToNode(req, res, "/legal-watch/unread-count"));
app.get("/api/legal-watch/status", auth, (req, res) => relayToNode(req, res, "/legal-watch/status"));
app.get("/api/legal-watch/config", auth, (req, res) => relayToNode(req, res, "/legal-watch/config"));
app.patch("/api/legal-watch/sources/:name", auth, (req, res) => relayToNode(req, res, `/legal-watch/sources/${encodeURIComponent(req.params.name as string)}`));
app.patch("/api/legal-watch/concepts/:concept", auth, (req, res) => relayToNode(req, res, `/legal-watch/concepts/${encodeURIComponent(req.params.concept as string)}`));

// ─── Administration (gestion des utilisateurs & rôles) ───
app.get("/api/admin/users", auth, (req, res) => relayToNode(req, res, "/admin/users"));
app.patch("/api/admin/users/:idUser/role", auth, (req, res) => relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/role`));
app.get("/api/admin/revenue", auth, (req, res) => relayToNode(req, res, "/admin/revenue"));
app.get("/api/admin/users/:idUser/details", auth, (req, res) => relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/details`));
app.patch("/api/admin/users/:idUser/ban", auth, (req, res) => relayToNode(req, res, `/admin/users/${encodeURIComponent(req.params.idUser as string)}/ban`));
app.get("/api/admin/feature-usage", auth, (req, res) => relayToNode(req, res, `/admin/feature-usage${req.query.days ? `?days=${encodeURIComponent(req.query.days as string)}` : ""}`));
app.get("/api/admin/feature-usage/users/:idUser", auth, (req, res) => relayToNode(req, res, `/admin/feature-usage/users/${encodeURIComponent(req.params.idUser as string)}${req.query.days ? `?days=${encodeURIComponent(req.query.days as string)}` : ""}`));
app.get("/api/admin/overview", auth, (req, res) => relayToNode(req, res, "/admin/overview"));

// ─── Négociation (module isolé) ───
// Publiques invité (sans auth — token = secret) ; placées AVANT /:externalId.
app.get("/api/negotiation/public/:token", (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/public/${encodeURIComponent(req.params.token as string)}`,
  ),
);
app.post("/api/negotiation/public/:token/comments", (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/public/${encodeURIComponent(req.params.token as string)}/comments`,
  ),
);
// Complétion guidée (invité) : saisie des champs et validation finale.
app.patch("/api/negotiation/public/:token/fields", (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/public/${encodeURIComponent(req.params.token as string)}/fields`,
  ),
);
app.post("/api/negotiation/public/:token/complete", (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/public/${encodeURIComponent(req.params.token as string)}/complete`,
  ),
);
// Entrée & liste
app.get("/api/negotiation/", auth, (req, res) =>
  relayToNode(req, res, "/negotiation/"),
);
app.post("/api/negotiation/enter", auth, (req, res) => {
  void trackFeature("negotiation", res.locals.userId as number | undefined);
  relayToNode(req, res, "/negotiation/enter");
});
app.post("/api/negotiation/enter-completion", auth, (req, res) => {
  void trackFeature("negotiation", res.locals.userId as number | undefined);
  relayToNode(req, res, "/negotiation/enter-completion");
});
app.get("/api/negotiation/contract/:contractExternalId", auth, (req, res) => relayToNode(req, res, `/negotiation/contract/${encodeURIComponent(req.params.contractExternalId as string)}`));
// Sous-ressources (avant /:externalId nu)
app.post("/api/negotiation/:externalId/abort", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}/abort`,
  ),
);
app.post("/api/negotiation/:externalId/exit", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}/exit`,
  ),
);
app.post(
  "/api/negotiation/:externalId/versions/:versionExternalId/validate",
  auth,
  (req, res) =>
    relayToNode(
      req,
      res,
      `/negotiation/${encodeURIComponent(req.params.externalId as string)}/versions/${encodeURIComponent(req.params.versionExternalId as string)}/validate`,
    ),
);
app.post("/api/negotiation/:externalId/versions", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}/versions`,
  ),
);
app.post("/api/negotiation/:externalId/proposals", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}/proposals`,
  ),
);
app.patch(
  "/api/negotiation/:externalId/proposals/:proposalExternalId",
  auth,
  (req, res) =>
    relayToNode(
      req,
      res,
      `/negotiation/${encodeURIComponent(req.params.externalId as string)}/proposals/${encodeURIComponent(req.params.proposalExternalId as string)}`,
    ),
);
app.patch(
  "/api/negotiation/:externalId/comments/:commentId/resolve",
  auth,
  (req, res) =>
    relayToNode(
      req,
      res,
      `/negotiation/${encodeURIComponent(req.params.externalId as string)}/comments/${encodeURIComponent(req.params.commentId as string)}/resolve`,
    ),
);
app.post("/api/negotiation/:externalId/comments", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}/comments`,
  ),
);
app.post("/api/negotiation/:externalId/participants", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}/participants`,
  ),
);
app.delete(
  "/api/negotiation/:externalId/participants/:participantExternalId",
  auth,
  (req, res) =>
    relayToNode(
      req,
      res,
      `/negotiation/${encodeURIComponent(req.params.externalId as string)}/participants/${encodeURIComponent(req.params.participantExternalId as string)}`,
    ),
);
app.post(
  "/api/negotiation/:externalId/guests/:guestExternalId/revoke",
  auth,
  (req, res) =>
    relayToNode(
      req,
      res,
      `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests/${encodeURIComponent(req.params.guestExternalId as string)}/revoke`,
    ),
);
app.post(
  "/api/negotiation/:externalId/guests/:guestExternalId/remind",
  auth,
  (req, res) =>
    relayToNode(
      req,
      res,
      `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests/${encodeURIComponent(req.params.guestExternalId as string)}/remind`,
    ),
);
app.post("/api/negotiation/:externalId/guests", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}/guests`,
  ),
);
app.get("/api/negotiation/:externalId", auth, (req, res) =>
  relayToNode(
    req,
    res,
    `/negotiation/${encodeURIComponent(req.params.externalId as string)}`,
  ),
);
// Diff structuré délégué au microservice Python.
app.post("/api/negotiation-diff", auth, (req, res) =>
  relayJsonToPython(req, res, "/negotiation-diff"),
);

// Health pour tester le serveur
app.get("/health", (req: Request, res: Response) => {
  return res.send({
    status: "OK",
    port: PORT,
    //urlBackendPython: BACKEND_URL,
    //urlBackendNodejs: BACKNODE_URL,
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur proxy running on : http://localhost:${PORT}`);
  console.log(`Backend Python url : ${BACKEND_URL}`);
  console.log(`Backend NodeJs url : ${BACKNODE_URL}`);
});

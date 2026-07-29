/* eslint-disable no-console */
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { proxyAuthMiddleware } from "./src/middleware/authMiddleware.js";


import { PORT, BACKEND_URL, BACKNODE_URL } from "./src/config.js";
import { relayStreamToPython, relayJsonToPython, relayToNode } from "./src/relay.js";



import { llmRouter } from "./src/routes/llm.js";
import { billingRouter } from "./src/routes/billing.js";
import { signatureRouter } from "./src/routes/signature.js";
import { clauseRouter } from "./src/routes/clause.js";
import { templateRouter } from "./src/routes/template.js";
import { contractRouter } from "./src/routes/contract.js";
import { negociationRouter } from "./src/routes/negociation.js";
import { legalWatchRouter } from "./src/routes/legalWatch.js";
import { feedbackRouter } from "./src/routes/feedback.js";
import { userRouter } from "./src/routes/user.js";
import { contractHistoryRouter } from "./src/routes/contractHistory.js";
import { enterpriseRouter } from "./src/routes/enterprise.js";
import { userUploadsRouter } from "./src/routes/userUploads.js";
import { addinRouter } from "./src/routes/addin.js";
import { analyzerRouter } from "./src/routes/analyzer.js";
import { chatHistoryRouter } from "./src/routes/chatHistory.js";
import { veilleRouter } from "./src/routes/veille.js";
import { openaiRouter } from "./src/routes/callopenai.js";
import { legalTextRouter } from "./src/routes/legalText.js";
import { aiRouter } from "./src/routes/ai.js";
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
app.use("/api/contract", contractRouter); addinRouter
app.use("/api/negociation", negociationRouter)
app.use("/api/legal-watch", legalWatchRouter)
app.use("/api/feedback", feedbackRouter)
app.use("/api/user", userRouter)
app.use("/api/contract-history", contractHistoryRouter)
app.use("/api/enterprise", enterpriseRouter)
app.use("/api/user-uploads", userUploadsRouter)
app.use("/api/addin", addinRouter)
app.use("/api/analyzer", analyzerRouter)
app.use("/api/chat-history", chatHistoryRouter)
app.use("/api/veille", veilleRouter)
app.use("/api/openai", openaiRouter)
app.use("/api/legal-text", legalTextRouter)
app.use("/api/ai", aiRouter)





// Health pour tester le serveur
app.get("/health", (req: Request, res: Response) => {
  return res.send({
    status: "OK",
    port: PORT,
  });
});



// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur proxy running on : http://localhost:${PORT}`);
  console.log(`Backend Python url : ${BACKEND_URL}`);
  console.log(`Backend NodeJs url : ${BACKNODE_URL}`);
});
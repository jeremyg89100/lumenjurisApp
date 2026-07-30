import { Router } from "express"
import { withTracking, logOpenAiTokens } from "../tracking.js"
import { proxyAuthMiddleware } from "../middleware/authMiddleware.js";
import { relayJsonToPython } from "../relay.js";


export const openaiRouter : Router = Router()


openaiRouter.post("/chat", proxyAuthMiddleware, (req, res) => {
  relayJsonToPython(req, res, "/chat", withTracking("chat", logOpenAiTokens));
});



openaiRouter.post("/openai-chat", proxyAuthMiddleware, (req, res) => {
  relayJsonToPython(req, res, "/openai-chat", withTracking("openai_chat", logOpenAiTokens))
});

openaiRouter.post("/openai-chat-5", proxyAuthMiddleware, (req, res) => {
  relayJsonToPython(req, res, "/openai-chat-5", withTracking("openai_chat", logOpenAiTokens))
});

import { Router } from "express"
import { relayJsonToPython } from "../relay.js";
import { proxyAuthMiddleware } from "../middleware/authMiddleware.js";


export const aiRouter : Router = Router()


aiRouter.post("/huggingface-generate", proxyAuthMiddleware, (req, res) => {
  relayJsonToPython(req, res, "/huggingface-generate")
}
);
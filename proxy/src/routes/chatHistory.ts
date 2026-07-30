import { Router} from "express"
import { relayToNode } from "../relay.js";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";

export const chatHistoryRouter : Router = Router()

chatHistoryRouter.get("/", auth, (req, res) => {
  relayToNode(req, res, "/chat-history");
});

chatHistoryRouter.put("/", auth, (req, res) => {
  relayToNode(req, res, "/chat-history");
});

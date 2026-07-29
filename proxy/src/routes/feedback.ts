import { Router } from "express"
import { relayToNode } from "../relay.js";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";


export const feedbackRouter: Router = Router()




feedbackRouter.post("/", auth, (req,res)=>{
    relayToNode(req, res, "/feedback")
});

feedbackRouter.get("/", auth, (req,res)=>{
    relayToNode(req, res, "/feedback")
});

feedbackRouter.delete("/bulk", auth, (req, res) =>
    relayToNode(req, res, "/feedback/bulk"),
);

feedbackRouter.delete("/:id", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/feedback/${encodeURIComponent(req.params.id as string)}`,
    ),
);
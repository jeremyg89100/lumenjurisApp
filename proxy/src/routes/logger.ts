import { Router } from "express"
import { relayToNode } from "../relay.js";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";


export const loggerRouter: Router = Router()




loggerRouter.post("/", auth, (req,res)=>{
    relayToNode(req, res, "/logger")
});

loggerRouter.get("/", auth, (req,res)=>{
    relayToNode(req, res, "/logger")
});

loggerRouter.delete("/bulk", auth, (req, res) =>
    relayToNode(req, res, "/logger/bulk"),
);

loggerRouter.delete("/:id", auth, (req, res) =>
    relayToNode(
        req,
        res,
        `/logger/${encodeURIComponent(req.params.id as string)}`,
    ),
);

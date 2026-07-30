import { Router } from "express"
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js" 
import { handleSummarizeContract } from "../utils/summariseContract/handleSummarizeContract.js";
import { handleGetListSummarizeContract } from "../utils/summariseContract/handleGetListSummarizeContract.js";
import { handleGetContractSummarize } from "../utils/summariseContract/handleGetContractSummarize.js";

export const summarizeCpntractRouter : Router = Router()



// Chemin relatif ->  /api/summarize-contract

summarizeCpntractRouter.post("/", auth, handleSummarizeContract);
summarizeCpntractRouter.get("/list-contract-summarize", auth, handleGetListSummarizeContract);
summarizeCpntractRouter.get("/contract-summarize-content", auth, handleGetContractSummarize);

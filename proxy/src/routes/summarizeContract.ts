import { Router } from "express"
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js" 
import { handleSummarizeContract } from "../utils/summariseContract/handleSummarizeContract.js";
import { handleGetListSummarizeContract } from "../utils/summariseContract/handleGetListSummarizeContract.js";
import { handleGetContractSummarize } from "../utils/summariseContract/handleGetContractSummarize.js";
import { handleDeleteContractSummarize } from "../utils/summariseContract/handleDeleteContractSummarize.js";

export const summarizeContractRouter : Router = Router()



// Chemin relatif ->  /api/summarize-contract

summarizeContractRouter.post("/", auth, handleSummarizeContract);
summarizeContractRouter.get("/list-contract-summarize", auth, handleGetListSummarizeContract);
summarizeContractRouter.get("/content", auth, handleGetContractSummarize);
summarizeContractRouter.delete("/delete", auth, handleDeleteContractSummarize);

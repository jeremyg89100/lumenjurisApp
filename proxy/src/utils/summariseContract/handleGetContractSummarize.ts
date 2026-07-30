
import { type Request, Response } from "express"

export async function handleGetContractSummarize(req: Request, res: Response) {
    


    console.log("DECLNCHEMENT DE GET CONTENT CONTRAT SUMMARIZE")
    const BACKNODE_URL = process.env.BACKNODE_URL

    const userId = res.locals.userId;
    const { idSummary } = req.query;

    if (!userId) {
        res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
        return;
    }

    if (!idSummary) {
        return res.status(400).json({ success: false, message: "L'identifiant idSummary est requis." });
    }

    try {
        const response = await fetch(`${BACKNODE_URL}/contract/contract-summary-info?idSummary=${idSummary}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
                "x-user-id": String(userId),
                "x-user-role": String(res.locals.role ?? "USER"),
            }
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({ success: false }));
            return res.status(response.status).json(data);
        }

        const data = await response.json() as { success: true, data: any };

        return res.status(200).json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur interne";
        res.status(500).json({ success: false, message: message });
    }
}
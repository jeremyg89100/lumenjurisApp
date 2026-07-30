
import { type Request, Response } from "express"

export async function handleGetListSummarizeContract(req: Request, res: Response) {
    
    
    const BACKNODE_URL = process.env.BACKNODE_URL
    const userId = res.locals.userId;
    if (!userId) {
        res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
        return;
    }
    try {
        const response = await fetch(`${BACKNODE_URL}/contract/list-contract-summary`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
                "x-user-id": String(userId),
                "x-user-role": String(res.locals.role ?? "USER"),
            }
        });

        if (!response.ok) {
            const body = await response.text().catch(() => "(body illisible)");
            console.error(`[list-contract-summarize] backNode ${response.status}:`, body);
            throw new Error(`backNode ${response.status}: ${body.slice(0, 200)}`);
        }
        const data = await response.json() as { success: boolean; data: any };

        return res.status(200).json(data);

    } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur interne";
        console.error("[list-contract-summarize] catch:", message);
        res.status(500).json({ success: false, message: message });
    }
}
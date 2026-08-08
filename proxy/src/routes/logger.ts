import { Router } from "express";
import crypto from "crypto";
import { relayToNode } from "../relay.js";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import { appendLogsToFile, readLogFile, deleteLogsByIds } from "../utils/logger.js";

export const loggerRouter: Router = Router();

// 📥 Réception des logs FrontEnd (écriture directe JSON)
loggerRouter.post("/", (req, res) => {
    try {
        const rawLogs = req.body?.logs || (Array.isArray(req.body) ? req.body : [req.body]);
        const entries: any[] = [];

        for (const item of rawLogs) {
            if (item && item.comment) {
                entries.push({
                    id: crypto.randomUUID(), 
                    date: new Date().toISOString(),
                    comment: item.comment,
                    context: item.context || "[FRONTEND] Error",
                    page: item.page || "/",
                });
            }
        }

        if (entries.length === 0) {
            return res.status(400).json({ success: false, message: "Aucun log valide extrait" });
        }

        appendLogsToFile("front-logger.json", entries);
        return res.status(201).json({ success: true, count: entries.length });
    } catch (err) {
        console.error("[PROXY LOGGER ERROR]", err);
        return res.status(500).json({ success: false, message: "Erreur écriture fichier Front JSON" });
    }
});

// 🗑️ Suppression en masse (JSON locaux + Transmission au BackNode)
loggerRouter.delete("/bulk", auth, async (req, res) => {
    try {
        const ids: string[] = req.body?.ids || [];

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "Aucun ID fourni pour la suppression" });
        }

        deleteLogsByIds(["front-logger.json", "proxy-logger.json"], ids);

        const BACKNODE_URL = process.env.BACKNODE_URL;
        if (BACKNODE_URL) {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
            };
            if (res.locals.userId !== undefined) {
                headers["x-user-id"] = String(res.locals.userId);
                headers["x-user-role"] = String(res.locals.role) ?? "USER";
            }

            const backRes = await fetch(`${BACKNODE_URL}/logger/bulk?ids=${encodeURIComponent(ids.join(","))}`, {
                method: "DELETE",
                headers,
            }).catch((err) => {
                console.error("[PROXY au BACKNODE] Erreur réseau suppression bulk :", err);
                return null;
            });

            if (backRes && !backRes.ok) {
                console.error("[PROXY au BACKNODE] Suppression bulk refusée, statut :", backRes.status);
            }
        }

        return res.json({ success: true, message: `${ids.length} log(s) supprimé(s)` });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Erreur lors de la suppression" });
    }
});

loggerRouter.delete("/:id", auth, async (req, res) => {
    try {
        const id = String(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: "ID manquant" });

        deleteLogsByIds(["front-logger.json", "proxy-logger.json"], [id]);

        const BACKNODE_URL = process.env.BACKNODE_URL;
        if (BACKNODE_URL) {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
            };
            if (res.locals.userId !== undefined) {
                headers["x-user-id"] = String(res.locals.userId);
                headers["x-user-role"] = String(res.locals.role) ?? "USER";
            }

            const backRes = await fetch(`${BACKNODE_URL}/logger/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers,
            }).catch((err) => {
                console.error("[PROXY au BACKNODE] Erreur réseau suppression unitaire :", err);
                return null;
            });

            if (backRes && !backRes.ok) {
                console.error("[PROXY au BACKNODE] Suppression unitaire refusée, statut :", backRes.status);
            }
        }

        return res.json({ success: true, message: "Log supprimé" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Erreur suppression unitaire" });
    }
});
loggerRouter.get("/monitoring", auth,  async (req, res) => {
    const frontLogs = readLogFile("front-logger.json");
    const proxyLogs = readLogFile("proxy-logger.json");
    let backLogs: any[] = [];

    try {
    const BACKNODE_URL = process.env.BACKNODE_URL;
    
    const idsParam = req.query.ids as string || "";
    const ids = idsParam ? idsParam.split(",") : [];

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
    };

    if (res.locals.userId !== undefined) {
        headers["x-user-id"] = String(res.locals.userId);
        headers["x-user-role"] = String(res.locals.role) ?? "USER";
    }

    if (BACKNODE_URL) {
        const response = await fetch(`${BACKNODE_URL}/logger`, { 
            method: "GET",
            headers,
         });
        if (response.ok) {
            const json = await response.json();
            backLogs = json.data || json;
        } else {
            console.error(" BackNode a répondu avec le statut :", response.status);
        }
    }
    } catch {
        backLogs = [{
            id: crypto.randomUUID(),
            comment: "[BACKNODE] BackNode inaccessible ou hors ligne",
            date: new Date().toISOString()
        }];
    }

    return res.json({
        success: true,
        data: {
            front: frontLogs,
            proxy: proxyLogs,
            back: backLogs,
        }
    });
});

loggerRouter.get("/", auth, (req, res) => {
    relayToNode(req, res, "/logger");
});

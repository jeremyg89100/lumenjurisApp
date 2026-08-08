import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
// Importez votre helper d'écriture créé précédemment
import { appendLogsToFile } from "../utils/logger.js";

export const addErrorFeedbackLogger = (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.includes("/logger") || req.originalUrl.includes("auto-log") || req.originalUrl.includes("/monitoring")) {
        return next();
    }

    const start = Date.now();

    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any = null;

    res.send = function (body?: any) {
        if (body) {
            try { responseBody = typeof body === "string" ? JSON.parse(body) : body; } 
            catch { responseBody = body; }
        }
    return originalSend.call(this, body);
    };

    res.json = function (body?: any) {
        if (body) responseBody = body;
        return originalJson.call(this, body);
    };

    res.on("finish", () => {
        if (res.getHeader("x-auto-logged") || res.getHeader("X-Auto-Logged")) {
            return;
        }
        
        if (res.statusCode >= 400) {
            const duration = Date.now() - start;
            const cleanUrl = decodeURI(req.originalUrl || req.url);

            const errorType = res.statusCode >= 500 ? "SERVER_ERROR" : "CLIENT_ERROR";
            const context = `[Auto-Log ${errorType}] ${req.method} ${cleanUrl}`;

            let extractedMessage = "";

            if (typeof responseBody === "string") {
                extractedMessage = responseBody;
            } else if (typeof responseBody === "object" && responseBody !== null) {
                extractedMessage = responseBody.message || responseBody.error || responseBody.msg || res.locals.errorMessage || JSON.stringify(responseBody);
            }

            const detailMsg = extractedMessage ? `Détails : ${extractedMessage}` : "";
            const comment = `[PROXY] - Erreur HTTP ${res.statusCode} (${res.statusMessage || "Error"})\nDurée : ${duration}ms.\n${detailMsg}`;

            const page = cleanUrl.split("?")[0] || "/";

            const rawUserId = (req as any).idUser;
            const userId = rawUserId ? String(rawUserId) : undefined;

            const logEntry = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                comment,
                context,
                page,
                userId
            };

            appendLogsToFile("proxy-logger.json", [logEntry]);
        }
    });

    next();
};

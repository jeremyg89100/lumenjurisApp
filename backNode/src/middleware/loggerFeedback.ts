import { NextFunction, Request, Response } from "express";
import { addErrorFeedbackLog } from "../route/apiLogger.js";

export const addErrorFeedbackLogger = (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.includes("logger") || req.originalUrl.includes("auto-log")) {
        return next();
    }

    const start = Date.now();

    const originalSend = res.send;
    let responseBody: any = null;

    
    res.send = function (body?: any) {
        if (res.statusCode >= 400) {
            res.setHeader("X-Auto-Logged", "true");
        }
        if (body) {
            try {
                responseBody = typeof body === "string" ? JSON.parse(body) : body;
                } catch {
                    responseBody = body;
                }
            }
            return originalSend.call(this, body);
        }

    res.on("finish", () => {
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
            const comment = `[BACKNODE] - Erreur HTTP ${res.statusCode} (${res.statusMessage || "Error"}) \nDurée : ${duration}ms.\n${detailMsg}`;

            const page = cleanUrl.split("?")[0] || "/";

            const rawUserId = (req as any).idUser;
            const userId = rawUserId ? String(rawUserId) : undefined;

            addErrorFeedbackLog({comment, context, page, userId});
        }
    });
    next();
}

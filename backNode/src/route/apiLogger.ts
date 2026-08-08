import express from "express";
import type { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { feedBackLimiter } from "../securite/limiter.js";
const routerLogger: Router = express.Router();

// Chemin absolu : lumenjuris/backNode/logger.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.resolve(__dirname, "../../logger.json");

interface FeedbackEntry {
  id: string;
  date: string;
  comment: string;
  context: string;
  page: string;
  userId?: string;
}

export function readLog(): FeedbackEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const raw = fs.readFileSync(LOG_FILE, "utf-8");
    return JSON.parse(raw) as FeedbackEntry[];
  } catch {
    return [];
  }
}

export function writeLog(entries: FeedbackEntry[]): void {
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export function addErrorFeedbackLog(params: {comment: string, context: string, page: string, userId?: string}): void {
  try {
    const entry: FeedbackEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      comment: params.comment.trim(),
      context: params.context.trim(),
      page: params.page.trim(),
      userId: params.userId,
    };

    const entries = readLog();
    entries.unshift(entry);
    writeLog(entries)
  } catch (err) {
    console.error("[feedback-logger] Impossible d'écrire l'erreur dans le JSON", err);
  }
}

// POST /logger — soumettre un commentaire
routerLogger.post(
  "/",
  (req: Request, res: Response) => {
    try {
      let rawList: any[] = [];

      if (req.body?.logs && Array.isArray(req.body.logs)) {
        rawList = req.body.logs;
      } else if (Array.isArray(req.body)) {
        rawList = req.body;
      } else if (req.body && typeof req.body === "object") {
        rawList = [req.body];
      }

      const newEntries: FeedbackEntry[] = [];

      for (const item of rawList) {
        const { comment, context, page } = item || {};

        if (comment && typeof comment === "string" && comment.trim()) {
          newEntries.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            comment: comment.trim().slice(0, 2000),
            context: (context || "Inconnu").trim(),
            page: (page || "/").trim(),
            userId: req.idUser ?? undefined,
          });
        }
      }

      if (newEntries.length === 0) {
        return res.status(400).json({ success: false, message: "Aucun log valide fourni." });
      }

      const entries = readLog();
      entries.unshift(...newEntries);
      writeLog(entries);

      return res.status(201).json({ success: true, count: newEntries.length });
    } catch (err) {
      console.error("[logger] POST error", err);
      return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
  }
);

// GET /logger — consulter tous les logs (admin/dev)
routerLogger.get(
  "/",
  (_req: Request, res: Response) => {
    try {
      const entries = readLog();
      return res.status(200).json({ success: true, data: entries, total: entries.length });
    } catch (err) {
      console.error("[logger] GET error", err);
      return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
  },
);

// DELETE /logger/bulk — suppression multiple (body: { ids: string[] })
routerLogger.delete(
  "/bulk",
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const idsParam = req.query.ids as string | undefined;
      const ids = idsParam ? idsParam.split(",") : [];
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: "ids doit être un tableau non vide." });
      }
      const toDelete = new Set(ids.filter((id): id is string => typeof id === "string"));
      const entries = readLog();
      const filtered = entries.filter((e) => !toDelete.has(e.id));
      writeLog(filtered);
      return res.status(200).json({ success: true, deleted: entries.length - filtered.length });
    } catch (err) {
      console.error("[feedback] DELETE bulk error", err);
      return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
  },
);

// DELETE /logger/:id — suppression d'un seul feedback
routerLogger.delete(
  "/:id",
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const entries = readLog();
      const filtered = entries.filter((e) => e.id !== id);
      if (filtered.length === entries.length) {
        return res.status(404).json({ success: false, message: "Feedback introuvable." });
      }
      writeLog(filtered);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("[feedback] DELETE error", err);
      return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
  },
);

routerLogger.post("/auto-log", (req: Request, res: Response) => {
  try {
    const { comment, context, page, userId } = req.body as {
      comment?: string;
      context?: string;
      page?: string;
      userId?: string;
    };

    if (!comment) {
      return res.status(400).json({ success: false, message: "Contenu vide." });
    }

    addErrorFeedbackLog({
      comment,
      context: context || "Auto-Log Proxy",
      page: page || "/",
      userId: userId || undefined,
    });

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("[logger] POST auto-log error", err);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

export default routerLogger;

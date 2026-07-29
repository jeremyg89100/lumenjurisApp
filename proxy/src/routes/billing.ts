import { Router } from "express";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";
import { relayToNode, relayToNodeRaw } from "../relay.js";

// Monté sur "/api/billing" — chemins relatifs.
export const billingRouter: Router = Router();

// NOTE : /customer et /payment-intent étaient enregistrés deux fois dans l'ancien
// index.ts. Doublon conservé à l'identique (refactor purement structurel).
billingRouter.post("/customer", auth, (req, res) =>
  relayToNode(req, res, "/billing/customer"),
);
billingRouter.post("/payment-intent", auth, (req, res) =>
  relayToNode(req, res, "/billing/payment-intent"),
);

billingRouter.post("/customer", auth, (req, res) =>
  relayToNode(req, res, "/billing/customer"),
);
billingRouter.post("/payment-intent", auth, (req, res) =>
  relayToNode(req, res, "/billing/payment-intent"),
);
billingRouter.get("/plans", auth, (req, res) =>
  relayToNode(req, res, "/billing/plans"),
);
billingRouter.post("/subscription", auth, (req, res) =>
  relayToNode(req, res, "/billing/subscription"),
);
billingRouter.get("/subscription", auth, (req, res) =>
  relayToNode(req, res, "/billing/subscription"),
);
billingRouter.get("/invoices", auth, (req, res) =>
  relayToNode(req, res, "/billing/invoices"),
);
billingRouter.get("/invoices/:idFacture/pdf", auth, (req, res) =>
  relayToNodeRaw(
    req,
    res,
    `/billing/invoices/${encodeURIComponent(req.params.idFacture as string)}/pdf`,
  ),
);
billingRouter.post("/payment-failed", auth, (req, res) =>
  relayToNode(req, res, "/billing/payment-failed"),
);
billingRouter.put("/add-credits", auth, (req, res) =>
  relayToNode(req, res, "/billing/add-credits"),
);
billingRouter.put("/remove-credits", auth, (req, res) =>
  relayToNode(req, res, "/billing/remove-credits"),
);
billingRouter.get("/credits", auth, (req, res) =>
  relayToNode(req, res, "/billing/credits"),
);

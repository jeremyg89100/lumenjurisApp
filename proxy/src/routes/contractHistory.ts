import { Router } from "express"
import { relayToNode } from "../relay.js";
import { proxyAuthMiddleware as auth } from "../middleware/authMiddleware.js";


export const contractHistoryRouter: Router = Router()




contractHistoryRouter.get("/", auth, (req, res) => {
    relayToNode(req, res, "/contract-history");

});

contractHistoryRouter.post("/", auth, (req, res) => {
    relayToNode(req, res, "/contract-history");

});

contractHistoryRouter.get("/:externalId", auth, (req, res) => {
    const externalId = encodeURIComponent(req.params.externalId as string);
    relayToNode(req, res, `/contract-history/${externalId}`);
});

contractHistoryRouter.delete("/:externalId", auth, (req, res) => {
    const externalId = encodeURIComponent(req.params.externalId as string);
    relayToNode(req, res, `/contract-history/${externalId}`);
});


contractHistoryRouter.patch("/:externalId/touch", auth, (req, res) => {
    const externalId = encodeURIComponent(req.params.externalId as string);
    relayToNode(req, res, `/contract-history/${externalId}/touch`);
});
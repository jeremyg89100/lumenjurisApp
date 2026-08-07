import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.locals.errorMessage = err?.message || String(err);

  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  return res.status(statusCode).json({
    success: false,
    message: err?.message || "Erreur interne du serveur.",
  });
};

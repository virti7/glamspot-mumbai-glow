import type { Request, Response, NextFunction } from "express";
import { AppError } from "@glamspot/shared/schemas";

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[Error]", err);

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof Response) {
    res.status(err.status).json({ error: "Unauthorized" });
    return;
  }

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

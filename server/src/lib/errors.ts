import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

type FieldErrors = Record<string, string[]>;

function zodDetails(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.errors) {
    const key = issue.path.length ? issue.path.join(".") : "_root";
    fields[key] = fields[key] ?? [];
    fields[key].push(issue.message);
  }
  return fields;
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: { message: "Not found" } });
}

// Express identifies error middleware by arity, so all four params are required.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ ok: false, error: { message: error.message } });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      ok: false,
      error: { message: "Some fields need attention", fields: zodDetails(error) },
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ ok: false, error: { message: "Malformed JSON body" } });
    return;
  }

  const name = (error as { name?: string } | null)?.name;
  const code = (error as { code?: string } | null)?.code;

  if (name === "JsonWebTokenError" || name === "TokenExpiredError") {
    res.status(401).json({ ok: false, error: { message: "Your session has expired. Please sign in again." } });
    return;
  }

  if (code === "P2002") {
    res.status(409).json({ ok: false, error: { message: "That record already exists" } });
    return;
  }

  if (code === "P2025") {
    res.status(404).json({ ok: false, error: { message: "Record not found" } });
    return;
  }

  console.error("Unhandled API error", error);
  res.status(500).json({ ok: false, error: { message: "Something went wrong on our side" } });
}

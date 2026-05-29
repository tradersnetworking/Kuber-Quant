import type { Request, Response, NextFunction, RequestHandler } from "express";

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string }> } };

type BodySchema<T> = {
  safeParse: (input: unknown) => SafeParseResult<T>;
};

/** Parse and attach req.validatedBody; returns 400 with field errors on failure. */
export function validateBody<T>(schema: BodySchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(i => ({
        path: i.path.join(".") || "body",
        message: i.message,
      }));
      res.status(400).json({ error: "Validation failed", details });
      return;
    }
    (req as Request & { validatedBody: T }).validatedBody = result.data;
    next();
  };
}

export function getValidatedBody<T>(req: Request): T {
  return (req as Request & { validatedBody: T }).validatedBody;
}

/** Parse JSON from a multipart text field (e.g. multer `req.body.data`). */
export function validateMultipartJsonField<T>(field: string, schema: BodySchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.body?.[field];
    if (typeof raw !== "string" || !raw.trim()) {
      res.status(400).json({
        error: "Validation failed",
        details: [{ path: field, message: "required JSON string" }],
      });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(400).json({
        error: "Validation failed",
        details: [{ path: field, message: "invalid JSON" }],
      });
      return;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const details = result.error.issues.map(i => ({
        path: i.path.join(".") || field,
        message: i.message,
      }));
      res.status(400).json({ error: "Validation failed", details });
      return;
    }
    (req as Request & { validatedBody: T }).validatedBody = result.data;
    next();
  };
}

import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";

export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || target}: ${issue.message}`)
        .join("; ");
      return c.json({ error: { code: "invalid_request", message } }, 400);
    }
    return undefined;
  });
}

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

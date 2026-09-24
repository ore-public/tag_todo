import { Hono } from "hono";
import { getUserEmail } from "../../usecases/users";
import type { AppEnv } from "../env";

export const meRoutes = new Hono<AppEnv>().get("/", async (c) => {
  return c.json({ email: await getUserEmail(c.env.DB, c.var.userId) });
});

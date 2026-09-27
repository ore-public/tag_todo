import { Hono } from "hono";
import { renderCalendarFeed } from "../../usecases/calendarFeeds";
import { AppError } from "../../usecases/errors";
import type { AppEnv } from "../env";

const FEED_FILE = /^(.+)\.ics$/;

/** カレンダーアプリが取得する iCal フィード。URL の "<フィード用トークン>.ics" で利用者を特定する */
export const icalRoutes = new Hono<AppEnv>().get("/:file", async (c) => {
  const token = FEED_FILE.exec(c.req.param("file"))?.[1];
  if (token === undefined) throw new AppError("not_found", "フィードが見つかりません");
  const body = await renderCalendarFeed(c.var.db, token);
  return c.body(body, 200, { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" });
});

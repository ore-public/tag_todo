import type { Database } from "../db/connection";
import { AppError } from "./errors";
import { toICalendar } from "./ical";
import { listTodos } from "./todos";
import { CALENDAR_FEED_TOKEN, findTokenOwner } from "./tokens";

/** フィード用トークンの持ち主の、未完了の todo を iCalendar 形式で返す */
export async function renderCalendarFeed(db: Database, token: string, now: Date = new Date()): Promise<string> {
  const userId = await findTokenOwner(db, CALENDAR_FEED_TOKEN, token);
  if (userId === null) throw new AppError("not_found", "フィードが見つかりません");
  return toICalendar(await listTodos(db, userId, { status: "open" }), now);
}

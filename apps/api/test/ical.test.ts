import type { Todo } from "@tag-todo/shared";
import { describe, expect, it } from "vitest";
import { toICalendar } from "../src/usecases/ical";

const NOW = new Date("2026-09-27T01:02:03.456Z");

function todo(fields: Partial<Todo>): Todo {
  return {
    id: 1,
    title: "牛乳を買う",
    note: "",
    done: false,
    doDate: null,
    dueDate: null,
    tags: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    ...fields,
  };
}

/** 折り返しを戻し、行ごとに分ける */
function lines(ics: string): string[] {
  return ics.replaceAll("\r\n ", "").split("\r\n");
}

describe("toICalendar", () => {
  it("実施日がある todo は、実施日の終日の予定にする", () => {
    const ics = toICalendar([todo({ id: 12, doDate: "2026-09-30" })], NOW);

    expect(ics).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//tag todo//JA",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:tag todo",
        "BEGIN:VEVENT",
        "UID:todo-12@tag-todo",
        "DTSTAMP:20260927T010203Z",
        "DTSTART;VALUE=DATE:20260930",
        "DTEND;VALUE=DATE:20261001",
        "SUMMARY:牛乳を買う",
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });

  it("実施日がなく期限日がある todo は、期限日に「期限:」を付けた予定にする", () => {
    const ics = lines(toICalendar([todo({ dueDate: "2026-10-05" })], NOW));

    expect(ics).toContain("DTSTART;VALUE=DATE:20261005");
    expect(ics).toContain("SUMMARY:期限: 牛乳を買う");
  });

  it("実施日も期限日もない todo は予定にしない", () => {
    expect(toICalendar([todo({})], NOW)).not.toContain("BEGIN:VEVENT");
  });

  it("説明に、メモ・タグ・期限日（実施日と両方あるとき）を入れる", () => {
    const ics = lines(
      toICalendar([todo({ doDate: "2026-09-30", dueDate: "2026-10-05", note: "低脂肪", tags: ["買い物", "家"] })], NOW),
    );

    expect(ics).toContain("DESCRIPTION:低脂肪\\nタグ: #買い物 #家\\n期限: 2026-10-05");
  });

  it("カンマ・セミコロン・バックスラッシュ・改行をエスケープする", () => {
    const ics = lines(toICalendar([todo({ doDate: "2026-09-30", title: "a,b;c\\d", note: "1行目\n2行目" })], NOW));

    expect(ics).toContain("SUMMARY:a\\,b\\;c\\\\d");
    expect(ics).toContain("DESCRIPTION:1行目\\n2行目");
  });

  it("75 バイトを超える行は、文字の途中で切らずに折り返す", () => {
    const title = "あ".repeat(40);
    const ics = toICalendar([todo({ doDate: "2026-09-30", title })], NOW);

    const rawLines = ics.split("\r\n");
    for (const line of rawLines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(lines(ics)).toContain(`SUMMARY:${title}`);
  });
});

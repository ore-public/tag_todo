import { localToday } from "@tag-todo/shared";
import { useEffect, useState } from "react";

/** 今日の日付。日付が変わったら更新する */
export function useToday(): string {
  const [today, setToday] = useState(localToday);
  useEffect(() => {
    const timer = setInterval(() => {
      setToday(localToday());
    }, 60_000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return today;
}

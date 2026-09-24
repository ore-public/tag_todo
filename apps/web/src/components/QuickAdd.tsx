import type { TodoCreate } from "@tag-todo/shared";
import { useState, type RefObject, type SyntheticEvent } from "react";
import { blurOnEscape } from "../lib/keyboard";
import { parseQuickAdd } from "../lib/quickAdd";

interface Props {
  today: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onAdd: (input: TodoCreate) => void;
}

/** 1行で todo を追加する入力欄。#タグ @実施日 !期限 を解釈する */
export function QuickAdd({ today, inputRef, onAdd }: Readonly<Props>) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    try {
      onAdd(parseQuickAdd(text, today));
      setText("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <form onSubmit={submit} className="quick-add">
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={blurOnEscape}
          placeholder="todo を追加（#タグ @実施日 !期限）"
          aria-label="todo を追加"
          aria-invalid={error !== null}
          enterKeyHint="done"
        />
        <button type="submit" className="primary">
          追加
        </button>
      </form>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

import { addDays, type Todo, type TodoUpdate } from "@tag-todo/shared";
import { useState, type SyntheticEvent } from "react";
import { useFocusOnMount } from "../hooks/useFocusOnMount";
import { Modal } from "./Modal";

export type EditorFocus = "title" | "tags";

interface Props {
  todo: Todo;
  today: string;
  focus: EditorFocus;
  onSave: (input: TodoUpdate) => void;
  onClose: () => void;
}

interface DateFieldProps {
  label: string;
  value: string;
  today: string;
  onChange: (value: string) => void;
}

/** スマホでも操作しやすいよう、よく使う日付をボタンで選べるようにする */
function DateField({ label, value, today, onChange }: Readonly<DateFieldProps>) {
  const shift = (days: number) => {
    onChange(addDays(value || today, days));
  };
  return (
    <div className="field">
      <label>
        {label}
        <input
          type="date"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      </label>
      <div className="date-buttons">
        <button
          type="button"
          onClick={() => {
            onChange(today);
          }}
        >
          今日
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(addDays(today, 1));
          }}
        >
          明日
        </button>
        <button
          type="button"
          onClick={() => {
            shift(-1);
          }}
          aria-label={`${label}を1日前にする`}
        >
          -1日
        </button>
        <button
          type="button"
          onClick={() => {
            shift(1);
          }}
          aria-label={`${label}を1日後にする`}
        >
          +1日
        </button>
        <button
          type="button"
          onClick={() => {
            onChange("");
          }}
        >
          なし
        </button>
      </div>
    </div>
  );
}

export function TodoEditor({ todo, today, focus, onSave, onClose }: Readonly<Props>) {
  const [title, setTitle] = useState(todo.title);
  const [note, setNote] = useState(todo.note);
  const [doDate, setDoDate] = useState(todo.doDate ?? "");
  const [dueDate, setDueDate] = useState(todo.dueDate ?? "");
  const [tags, setTags] = useState(todo.tags.join(" "));
  const titleRef = useFocusOnMount<HTMLInputElement>(focus === "title");
  const tagsRef = useFocusOnMount<HTMLInputElement>(focus === "tags");

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    onSave({
      title,
      note,
      doDate: doDate || null,
      dueDate: dueDate || null,
      tags: tags.split(/[\s,]+/).filter(Boolean),
    });
  };

  return (
    <Modal title="todo の編集" onClose={onClose}>
      <form onSubmit={submit} className="editor">
        <label className="field">
          タイトル
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            required
          />
        </label>
        <label className="field">
          タグ（空白区切り）
          <input
            ref={tagsRef}
            value={tags}
            onChange={(event) => {
              setTags(event.target.value);
            }}
          />
        </label>
        <DateField label="実施日" value={doDate} today={today} onChange={setDoDate} />
        <DateField label="期限" value={dueDate} today={today} onChange={setDueDate} />
        <label className="field">
          メモ
          <textarea
            value={note}
            rows={4}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="primary">
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}

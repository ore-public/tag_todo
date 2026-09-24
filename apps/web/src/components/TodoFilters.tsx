import type { Tag } from "@tag-todo/shared";
import type { RefObject } from "react";
import { blurOnEscape } from "../lib/keyboard";

interface Props {
  tags: Tag[];
  tagFilter: string | undefined;
  showDone: boolean;
  selectRef: RefObject<HTMLSelectElement | null>;
  onTagFilterChange: (tag: string | undefined) => void;
  onShowDoneChange: (showDone: boolean) => void;
}

export function TodoFilters({
  tags,
  tagFilter,
  showDone,
  selectRef,
  onTagFilterChange,
  onShowDoneChange,
}: Readonly<Props>) {
  return (
    <div className="filters">
      <select
        ref={selectRef}
        aria-label="タグで絞り込み"
        value={tagFilter ?? ""}
        onChange={(event) => {
          onTagFilterChange(event.target.value || undefined);
        }}
        onKeyDown={blurOnEscape}
      >
        <option value="">すべてのタグ</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.name}>
            #{tag.name} ({tag.openCount})
          </option>
        ))}
      </select>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={showDone}
          onChange={(event) => {
            onShowDoneChange(event.target.checked);
          }}
        />
        完了済みも表示
      </label>
    </div>
  );
}

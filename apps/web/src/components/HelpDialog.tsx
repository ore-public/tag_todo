import { Modal } from "./Modal";

const SHORTCUTS: [string, string][] = [
  ["j / k", "カーソルを下 / 上に移動"],
  ["g / G", "先頭 / 末尾に移動"],
  ["Ctrl + j / Ctrl + k", "実施日を 1日後 / 1日前にする（未設定なら今日にする）"],
  ["x", "完了 / 未完了を切り替え"],
  ["Enter / e", "編集"],
  ["t", "タグを編集"],
  ["d", "削除"],
  ["o", "新規追加の入力欄に移動"],
  ["/", "タグの絞り込みに移動"],
  ["c", "完了済みの表示 / 非表示を切り替え"],
  ["?", "このヘルプを表示"],
  ["Esc", "ダイアログを閉じる / 入力欄から抜ける"],
];

export function HelpDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <Modal title="キーボード操作" onClose={onClose}>
      <dl className="help-list">
        {SHORTCUTS.map(([keys, description]) => (
          <div key={keys}>
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
      <p className="hint">
        追加欄では <code>#タグ</code> <code>@実施日</code> <code>!期限</code> を指定できます（例:{" "}
        <code>資料作成 #仕事 @tomorrow !+3d</code>）
      </p>
    </Modal>
  );
}

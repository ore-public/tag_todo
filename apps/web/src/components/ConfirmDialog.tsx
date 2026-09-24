import { useFocusOnMount } from "../hooks/useFocusOnMount";
import { Modal } from "./Modal";

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Readonly<Props>) {
  // Enter キーだけで確定できるようにする
  const confirmRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="modal-actions">
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button ref={confirmRef} type="button" className="danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

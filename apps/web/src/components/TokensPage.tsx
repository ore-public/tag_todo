import type { ApiToken, ApiTokenCreated } from "@tag-todo/shared";
import { useState, type SyntheticEvent } from "react";
import { useIssueToken, useRevokeToken, useTokens } from "../hooks/useTokens";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorMessage } from "./ErrorMessage";

function formatDateTime(value: string | null): string {
  return value === null ? "-" : new Date(value).toLocaleString("ja-JP");
}

function IssuedToken({ issued, onClose }: Readonly<{ issued: ApiTokenCreated; onClose: () => void }>) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="issued-token" role="status">
      <p>トークン「{issued.name}」を発行しました。この画面を閉じると再表示できないので、今コピーしてください。</p>
      <code>{issued.token}</code>
      <div className="modal-actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            void navigator.clipboard.writeText(issued.token).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? "コピーしました" : "コピー"}
        </button>
        <button type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
      <p className="hint">
        CLI での設定例: <code>tagtodo config --url {window.location.origin} --token &lt;トークン&gt;</code>
      </p>
    </div>
  );
}

export function TokensPage() {
  const tokensQuery = useTokens();
  const issueToken = useIssueToken();
  const revokeToken = useRevokeToken();
  const [name, setName] = useState("");
  const [revoking, setRevoking] = useState<ApiToken | null>(null);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    issueToken.mutate(name, {
      onSuccess: () => {
        setName("");
      },
    });
  };

  return (
    <main className="tokens-page">
      <h1>API トークン</h1>
      <p className="hint">CLI や外部アプリから todo を操作するときに使うトークンです。</p>
      <form onSubmit={submit} className="quick-add">
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="トークンの名前（例: MacBook の CLI）"
          aria-label="トークンの名前"
          required
        />
        <button type="submit" className="primary">
          発行
        </button>
      </form>
      {issueToken.data && (
        <IssuedToken
          issued={issueToken.data}
          onClose={() => {
            issueToken.reset();
          }}
        />
      )}
      {(tokensQuery.error ?? issueToken.error ?? revokeToken.error) && (
        <ErrorMessage error={tokensQuery.error ?? issueToken.error ?? revokeToken.error ?? new Error()} />
      )}
      <table className="tokens">
        <thead>
          <tr>
            <th>名前</th>
            <th>発行日時</th>
            <th>最終利用日時</th>
            <th aria-label="操作" />
          </tr>
        </thead>
        <tbody>
          {tokensQuery.data?.map((token) => (
            <tr key={token.id}>
              <td>{token.name}</td>
              <td>{formatDateTime(token.createdAt)}</td>
              <td>{formatDateTime(token.lastUsedAt)}</td>
              <td>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setRevoking(token);
                  }}
                >
                  失効
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {revoking && (
        <ConfirmDialog
          title="トークンの失効"
          message={`「${revoking.name}」を失効させます。このトークンを使っている CLI や外部アプリは使えなくなります。`}
          confirmLabel="失効"
          onCancel={() => {
            setRevoking(null);
          }}
          onConfirm={() => {
            revokeToken.mutate(revoking.id);
            setRevoking(null);
          }}
        />
      )}
    </main>
  );
}

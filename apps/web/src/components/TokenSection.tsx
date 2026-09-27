import type { ApiToken, ApiTokenCreated } from "@tag-todo/shared";
import { useId, useState, type ReactNode, type SyntheticEvent } from "react";
import { useIssueToken, useRevokeToken, useTokens, type TokenResource } from "../hooks/useTokens";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorMessage } from "./ErrorMessage";

function formatDateTime(value: string | null): string {
  return value === null ? "-" : new Date(value).toLocaleString("ja-JP");
}

interface IssuedProps {
  issued: ApiTokenCreated;
  value: string;
  hint: ReactNode;
  onClose: () => void;
}

function Issued({ issued, value, hint, onClose }: Readonly<IssuedProps>) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="issued-token" role="status">
      <p>「{issued.name}」を発行しました。この画面を閉じると再表示できないので、今コピーしてください。</p>
      <code>{value}</code>
      <div className="modal-actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
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
      <p className="hint">{hint}</p>
    </div>
  );
}

interface Props {
  resource: TokenResource;
  title: string;
  description: ReactNode;
  nameLabel: string;
  placeholder: string;
  /** 発行直後に表示してコピーさせる文字列（トークンそのもの、または URL） */
  issuedValue: (token: string) => string;
  issuedHint: ReactNode;
  revokeMessage: (name: string) => string;
}

/** トークンの発行・一覧・失効。API トークンとカレンダーのフィード用トークンで共通 */
export function TokenSection(props: Readonly<Props>) {
  const tokensQuery = useTokens(props.resource);
  const issueToken = useIssueToken(props.resource);
  const revokeToken = useRevokeToken(props.resource);
  const [name, setName] = useState("");
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  const headingId = useId();

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    issueToken.mutate(name, {
      onSuccess: () => {
        setName("");
      },
    });
  };

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{props.title}</h2>
      <p className="hint">{props.description}</p>
      <form onSubmit={submit} className="quick-add">
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder={props.placeholder}
          aria-label={props.nameLabel}
          required
        />
        <button type="submit" className="primary">
          発行
        </button>
      </form>
      {issueToken.data && (
        <Issued
          issued={issueToken.data}
          value={props.issuedValue(issueToken.data.token)}
          hint={props.issuedHint}
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
          message={props.revokeMessage(revoking.name)}
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
    </section>
  );
}

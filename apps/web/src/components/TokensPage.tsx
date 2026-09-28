import { TokenSection } from "./TokenSection";

export function TokensPage() {
  const origin = window.location.origin;
  return (
    <main className="tokens-page">
      <h1>連携設定</h1>
      <TokenSection
        resource="tokens"
        title="API トークン"
        description="CLI や外部アプリから todo を操作するときに使うトークンです。"
        nameLabel="トークンの名前"
        placeholder="トークンの名前（例: MacBook の CLI）"
        issuedValue={(token) => token}
        issuedHint={
          <>
            CLI での設定例: <code>tagtodo config --url {origin} --token &lt;トークン&gt;</code>
          </>
        }
        revokeMessage={(name) =>
          `「${name}」を失効させます。このトークンを使っている CLI や外部アプリは使えなくなります。`
        }
      />
      <TokenSection
        resource="calendar-feeds"
        title="カレンダー連携"
        description="Google Calendar などに URL を登録すると、未完了の todo を実施日（なければ期限日）の終日の予定として表示します。URL を知っている人は誰でも todo を読めるので、他の人に教えないでください。"
        nameLabel="フィードの名前"
        placeholder="フィードの名前（例: Google Calendar）"
        issuedValue={(token) => `${origin}/ical/${token}.ics`}
        issuedHint="Google Calendar では、左側の「他のカレンダー」の「+」から「URL で追加」を選び、この URL を貼り付けます。カレンダーへの反映には、数時間から 1 日ほどかかります。"
        revokeMessage={(name) =>
          `「${name}」を失効させます。この URL を登録したカレンダーには todo が表示されなくなります。`
        }
      />
    </main>
  );
}

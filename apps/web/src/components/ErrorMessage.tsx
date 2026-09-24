import { SessionExpiredError } from "../lib/errors";

export function ErrorMessage({ error }: Readonly<{ error: Error }>) {
  return (
    <div className="error" role="alert">
      <span>{error.message}</span>
      {error instanceof SessionExpiredError && (
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          再読み込み
        </button>
      )}
    </div>
  );
}

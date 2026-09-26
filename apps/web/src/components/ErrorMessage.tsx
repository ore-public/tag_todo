import { LOGIN_PATH, SessionExpiredError } from "../lib/errors";

export function ErrorMessage({ error }: Readonly<{ error: Error }>) {
  return (
    <div className="error" role="alert">
      <span>{error.message}</span>
      {error instanceof SessionExpiredError && <a href={LOGIN_PATH}>ログイン</a>}
    </div>
  );
}

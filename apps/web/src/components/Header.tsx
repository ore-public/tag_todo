import type { Route } from "../hooks/useRoute";
import { LOGOUT_PATH } from "../lib/errors";

interface Props {
  route: Route;
  email: string | undefined;
  onNavigate: (route: Route) => void;
  onHelp: () => void;
}

export function Header({ route, email, onNavigate, onHelp }: Readonly<Props>) {
  const link = (target: Route, label: string) => (
    <a
      href={target === "todos" ? "/" : "/tokens"}
      aria-current={route === target ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(target);
      }}
    >
      {label}
    </a>
  );
  return (
    <header className="header">
      <span className="logo">tag todo</span>
      <nav>
        {link("todos", "todo")}
        {link("tokens", "API トークン")}
      </nav>
      <span className="email">{email}</span>
      <a href={LOGOUT_PATH} className="logout">
        ログアウト
      </a>
      <button type="button" className="help-button" onClick={onHelp} aria-label="キーボード操作のヘルプ">
        ?
      </button>
    </header>
  );
}

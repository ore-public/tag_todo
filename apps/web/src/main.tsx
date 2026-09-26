import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";
import { LOGIN_PATH, SessionExpiredError } from "./lib/errors";
import "./styles.css";

/** ログインしていなければ、ログイン画面（Cognito）へ移動する */
function redirectToLoginIfNeeded(error: Error) {
  if (error instanceof SessionExpiredError) window.location.assign(LOGIN_PATH);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: redirectToLoginIfNeeded }),
  mutationCache: new MutationCache({ onError: redirectToLoginIfNeeded }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !(error instanceof SessionExpiredError) && failureCount < 2,
    },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("#root が見つかりません");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

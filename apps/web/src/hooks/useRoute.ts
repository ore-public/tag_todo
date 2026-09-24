import { useCallback, useEffect, useState } from "react";

export type Route = "todos" | "tokens";

const PATH_BY_ROUTE: Record<Route, string> = { todos: "/", tokens: "/tokens" };

function currentRoute(): Route {
  return window.location.pathname === PATH_BY_ROUTE.tokens ? "tokens" : "todos";
}

export function useRoute() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onPopState = () => {
      setRoute(currentRoute());
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
  const navigate = useCallback((next: Route) => {
    window.history.pushState(null, "", PATH_BY_ROUTE[next]);
    setRoute(next);
  }, []);
  return { route, navigate };
}

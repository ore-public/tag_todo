import { useState } from "react";
import { useMe } from "../hooks/useMe";
import { useRoute } from "../hooks/useRoute";
import { useToday } from "../hooks/useToday";
import { Header } from "./Header";
import { TodoPage } from "./TodoPage";
import { TokensPage } from "./TokensPage";

export function App() {
  const { route, navigate } = useRoute();
  const me = useMe();
  const today = useToday();
  const [helpRequested, setHelpRequested] = useState(false);

  return (
    <>
      <Header
        route={route}
        email={me.data?.email}
        onNavigate={navigate}
        onHelp={() => {
          navigate("todos");
          setHelpRequested(true);
        }}
      />
      {route === "todos" ? (
        <TodoPage
          today={today}
          helpRequested={helpRequested}
          onHelpClosed={() => {
            setHelpRequested(false);
          }}
        />
      ) : (
        <TokensPage />
      )}
    </>
  );
}

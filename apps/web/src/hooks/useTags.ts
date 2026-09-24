import { useQuery } from "@tanstack/react-query";
import { fetchTags } from "../api/client";

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: fetchTags });
}

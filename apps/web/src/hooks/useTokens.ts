import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTokens, issueToken, revokeToken } from "../api/client";

const TOKENS_KEY = ["tokens"] as const;

export function useTokens() {
  return useQuery({ queryKey: TOKENS_KEY, queryFn: fetchTokens });
}

export function useIssueToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => issueToken(name),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TOKENS_KEY }),
  });
}

export function useRevokeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => revokeToken(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TOKENS_KEY }),
  });
}

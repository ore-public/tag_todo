import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTokens, issueToken, revokeToken, type TokenResource } from "../api/client";

export type { TokenResource } from "../api/client";

export function useTokens(resource: TokenResource) {
  return useQuery({ queryKey: [resource], queryFn: () => fetchTokens(resource) });
}

export function useIssueToken(resource: TokenResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => issueToken(resource, name),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useRevokeToken(resource: TokenResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => revokeToken(resource, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}

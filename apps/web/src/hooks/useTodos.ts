import type { Todo, TodoCreate, TodoUpdate } from "@tag-todo/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createTodo, deleteTodo, fetchTodos, updateTodo, type TodoQuery } from "../api/client";

const TODOS_KEY = ["todos"] as const;
const TAGS_KEY = ["tags"] as const;

export function useTodos(query: TodoQuery) {
  // 絞り込みを変えたとき、読み込みが終わるまで前の一覧を表示し続ける
  return useQuery({
    queryKey: [...TODOS_KEY, query],
    queryFn: () => fetchTodos(query),
    placeholderData: keepPreviousData,
  });
}

function invalidateTodosAndTags(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: TODOS_KEY }),
    queryClient.invalidateQueries({ queryKey: TAGS_KEY }),
  ]);
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TodoCreate) => createTodo(input),
    onSettled: () => invalidateTodosAndTags(queryClient),
  });
}

function applyUpdate(todo: Todo, input: TodoUpdate): Todo {
  return {
    ...todo,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.note !== undefined && { note: input.note }),
    ...(input.done !== undefined && { done: input.done }),
    ...(input.doDate !== undefined && { doDate: input.doDate }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    ...(input.tags !== undefined && { tags: input.tags }),
  };
}

/** 画面にすぐ反映するため、サーバーの応答を待たずにキャッシュを書き換える */
export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TodoUpdate }) => updateTodo(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueriesData<Todo[]>({ queryKey: TODOS_KEY });
      queryClient.setQueriesData<Todo[]>({ queryKey: TODOS_KEY }, (todos) =>
        todos?.map((todo) => (todo.id === id ? applyUpdate(todo, input) : todo)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => invalidateTodosAndTags(queryClient),
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTodo(id),
    onSettled: () => invalidateTodosAndTags(queryClient),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Todo } from "@bmad-todo/shared";
import { listTodos, createTodo, toggleTodo, deleteTodo } from "../api/client.js";

const TODOS_KEY = ["todos"] as const;

export function useTodos() {
  return useQuery({ queryKey: TODOS_KEY, queryFn: listTodos });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => createTodo({ text }),
    onSuccess: (created) => {
      qc.setQueryData<Todo[]>(TODOS_KEY, (old) => (old ? [created, ...old] : [created]));
    },
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => toggleTodo(id, completed),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: TODOS_KEY });
      const previous = qc.getQueryData<Todo[]>(TODOS_KEY);
      qc.setQueryData<Todo[]>(TODOS_KEY, (old) =>
        old ? old.map((t) => (t.id === id ? { ...t, completed } : t)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TODOS_KEY, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TODOS_KEY });
      const previous = qc.getQueryData<Todo[]>(TODOS_KEY);
      qc.setQueryData<Todo[]>(TODOS_KEY, (old) => (old ? old.filter((t) => t.id !== id) : old));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TODOS_KEY, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });
}

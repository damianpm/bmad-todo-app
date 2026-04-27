import { useTodos } from "./hooks/useTodos.js";
import { AddTodoForm } from "./components/AddTodoForm.js";
import { TodoList } from "./components/TodoList.js";
import { EmptyState } from "./components/EmptyState.js";
import { LoadingState } from "./components/LoadingState.js";
import { ErrorState } from "./components/ErrorState.js";

export function App() {
  const todos = useTodos();

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">Todo</h1>
      </header>
      <section className="app__body">
        <AddTodoForm />
        {todos.isPending ? (
          <LoadingState />
        ) : todos.isError ? (
          <ErrorState
            message={todos.error instanceof Error ? todos.error.message : undefined}
            onRetry={() => void todos.refetch()}
          />
        ) : todos.data && todos.data.length > 0 ? (
          <TodoList todos={todos.data} />
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}

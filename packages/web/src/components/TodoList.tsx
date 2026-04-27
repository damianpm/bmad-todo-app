import type { Todo } from "@bmad-todo/shared";
import { TodoItem } from "./TodoItem.js";

interface TodoListProps {
  todos: Todo[];
}

export function TodoList({ todos }: TodoListProps) {
  return (
    <ul className="todo-list" aria-label="Todos">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

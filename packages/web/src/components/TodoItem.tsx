import type { Todo } from "@bmad-todo/shared";
import { useToggleTodo, useDeleteTodo } from "../hooks/useTodos.js";

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();

  return (
    <li className={`todo-item${todo.completed ? " todo-item--completed" : ""}`}>
      <label className="todo-item__label">
        <input
          type="checkbox"
          className="todo-item__checkbox"
          checked={todo.completed}
          onChange={(e) => toggle.mutate({ id: todo.id, completed: e.target.checked })}
          aria-label={`Mark "${todo.text}" as ${todo.completed ? "active" : "completed"}`}
        />
        <span className="todo-item__text">{todo.text}</span>
      </label>
      <button
        type="button"
        className="todo-item__delete"
        onClick={() => remove.mutate(todo.id)}
        aria-label={`Delete "${todo.text}"`}
      >
        Delete
      </button>
    </li>
  );
}

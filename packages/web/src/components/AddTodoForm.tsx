import { useRef, useState, type FormEvent } from "react";
import { useCreateTodo } from "../hooks/useTodos.js";

const MAX_LENGTH = 500;

export function AddTodoForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreateTodo();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Type something first.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync(trimmed);
      setText("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    }
  };

  return (
    <form className="add-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="todo-input" className="visually-hidden">
        New todo
      </label>
      <input
        id="todo-input"
        ref={inputRef}
        className="add-form__input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs doing?"
        maxLength={MAX_LENGTH}
        disabled={create.isPending}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? "todo-input-error" : undefined}
        autoFocus
      />
      <button
        type="submit"
        className="add-form__submit"
        disabled={create.isPending || text.trim().length === 0}
      >
        {create.isPending ? "Adding…" : "Add"}
      </button>
      {error ? (
        <p id="todo-input-error" className="add-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

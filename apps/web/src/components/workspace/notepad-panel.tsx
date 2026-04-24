"use client";

import { useEffect, useMemo, useState } from "react";

type TodoItem = {
  id: string;
  text: string;
  done: boolean;
};

type NotepadState = {
  notes: string;
  todos: TodoItem[];
};

interface NotepadPanelProps {
  onCreateItem: (payload: { title: string; body?: string; stage?: string }) => Promise<void>;
}

const STORAGE_KEY = "creatoros.workspace.notepad.v1";

function safeParse(value: string | null): NotepadState {
  if (!value) return { notes: "", todos: [] };

  try {
    const parsed = JSON.parse(value) as Partial<NotepadState>;
    return {
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      todos: Array.isArray(parsed.todos)
        ? parsed.todos
            .filter((entry): entry is TodoItem => {
              return Boolean(entry && typeof entry.id === "string" && typeof entry.text === "string" && typeof entry.done === "boolean");
            })
            .slice(0, 200)
        : [],
    };
  } catch {
    return { notes: "", todos: [] };
  }
}

export function NotepadPanel({ onCreateItem }: NotepadPanelProps) {
  const [notes, setNotes] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const parsed = safeParse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? null);
    setNotes(parsed.notes);
    setTodos(parsed.todos);
  }, []);

  useEffect(() => {
    const payload: NotepadState = { notes, todos };
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [notes, todos]);

  const remainingCount = useMemo(() => todos.filter((item) => !item.done).length, [todos]);

  const addTodo = () => {
    if (!newTodo.trim()) return;

    const todo: TodoItem = {
      id: crypto.randomUUID(),
      text: newTodo.trim(),
      done: false,
    };

    setTodos((current) => [todo, ...current]);
    setNewTodo("");
  };

  const convertTodoToCard = async (todo: TodoItem) => {
    if (!todo.text.trim()) return;
    setIsCreating(true);
    try {
      await onCreateItem({
        title: todo.text.trim(),
        body: notes.trim() ? `Captured from notepad\n\n${notes.trim()}` : "Captured from notepad",
        stage: "idea",
      });
      setTodos((current) => current.map((entry) => (entry.id === todo.id ? { ...entry, done: true } : entry)));
    } finally {
      setIsCreating(false);
    }
  };

  const convertRemainingTodos = async () => {
    const entries = todos.filter((item) => !item.done && item.text.trim());
    if (!entries.length) return;

    setIsCreating(true);
    try {
      for (const item of entries) {
        await onCreateItem({
          title: item.text.trim(),
          body: notes.trim() ? `Captured from notepad\n\n${notes.trim()}` : "Captured from notepad",
          stage: "idea",
        });
      }
      setTodos((current) => current.map((item) => (item.done ? item : { ...item, done: true })));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Scratchpad</h2>
          <p className="text-xs text-muted">Write freely. Keep rough notes and quick todo items before they become workspace cards.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotes("");
            setTodos([]);
          }}
          className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-background"
        >
          Clear
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Free notes, brainstorms, scripts, reminders..."
        rows={6}
        className="w-full rounded-md border border-border bg-background px-3 py-3 text-sm leading-6"
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={newTodo}
            onChange={(event) => setNewTodo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTodo();
              }
            }}
            placeholder="Add todo"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addTodo}
            disabled={!newTodo.trim()}
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Add
          </button>
        </div>

        <div className="space-y-1.5">
          {todos.length ? (
            todos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-2">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => {
                    setTodos((current) => current.map((item) => (item.id === todo.id ? { ...item, done: !item.done } : item)));
                  }}
                />
                <span className={`flex-1 text-sm ${todo.done ? "text-muted line-through" : "text-foreground"}`}>{todo.text}</span>
                {!todo.done ? (
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => void convertTodoToCard(todo)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-card disabled:opacity-60"
                  >
                    Send to board
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">No todos yet.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted">{remainingCount} open todo{remainingCount === 1 ? "" : "s"}</span>
        <button
          type="button"
          onClick={() => void convertRemainingTodos()}
          disabled={isCreating || remainingCount === 0}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isCreating ? "Adding..." : "Add open todos to board"}
        </button>
      </div>
    </section>
  );
}

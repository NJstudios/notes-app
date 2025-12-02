"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";

import { api, type Note, type Block } from "@/lib/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ------------ Helpers for todo/table shapes ------------

type TodoItem = {
  id: string;
  text: string;
  done: boolean;
};

type TableData = {
  columns: string[];
  rows: string[][];
};

// ------------------------------------------------------
// Per-block UI (uses Card, supports text / todo / table)
// ------------------------------------------------------

type BlockCardProps = {
  block: Block;
  onChange: (data: any) => void;
  onDelete: () => void;
};

const BlockCard = React.memo(function BlockCard({
  block,
  onChange,
  onDelete,
}: BlockCardProps) {
  // TEXT BLOCK
  if (block.type === "text") {
    return (
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Text</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Delete block"
          >
            ✕
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={block.data?.text ?? ""}
            onChange={(e) =>
              onChange({
                ...block.data,
                text: e.target.value,
              })
            }
            className="min-h-[140px]"
          />
        </CardContent>
      </Card>
    );
  }

  // TODO BLOCK
  if (block.type === "todo") {
    const items: TodoItem[] = Array.isArray(block.data?.items)
      ? block.data.items
      : [];

    const [newText, setNewText] = React.useState("");

    const updateItems = (next: TodoItem[]) => {
      onChange({
        ...block.data,
        items: next,
      });
    };

    const toggleItem = (id: string) => {
      updateItems(
        items.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item
        )
      );
    };

    const updateItemText = (id: string, text: string) => {
      updateItems(
        items.map((item) => (item.id === id ? { ...item, text } : item))
      );
    };

    const addItem = () => {
      const trimmed = newText.trim();
      if (!trimmed) return;
      const next: TodoItem[] = [
        ...items,
        {
          id: crypto.randomUUID(),
          text: trimmed,
          done: false,
        },
      ];
      updateItems(next);
      setNewText("");
    };

    const removeItem = (id: string) => {
      updateItems(items.filter((item) => item.id !== id));
    };

    return (
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Todo list</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Delete block"
          >
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem(item.id)}
                  className="h-4 w-4"
                />
                <Input
                  className="flex-1"
                  value={item.text}
                  onChange={(e) =>
                    updateItemText(item.id, e.target.value)
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                >
                  ✕
                </Button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No items yet. Add your first task below.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New task…"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
            />
            <Button onClick={addItem}>Add</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // TABLE BLOCK
  if (block.type === "table") {
    const table: TableData = {
      columns: Array.isArray(block.data?.columns)
        ? block.data.columns
        : ["Column 1", "Column 2"],
      rows: Array.isArray(block.data?.rows)
        ? block.data.rows
        : [],
    };

    const updateTable = (next: TableData) => {
      onChange({
        ...block.data,
        ...next,
      });
    };

    const updateHeader = (index: number, value: string) => {
      const nextCols = [...table.columns];
      nextCols[index] = value;
      updateTable({ ...table, columns: nextCols });
    };

    const updateCell = (
      rowIndex: number,
      colIndex: number,
      value: string
    ) => {
      const nextRows = table.rows.map((row, i) =>
        i === rowIndex
          ? row.map((cell, j) => (j === colIndex ? value : cell))
          : row
      );
      updateTable({ ...table, rows: nextRows });
    };

    const addRow = () => {
      const newRow = table.columns.map(() => "");
      updateTable({
        ...table,
        rows: [...table.rows, newRow],
      });
    };

    const addColumn = () => {
      const nextCols = [...table.columns, `Column ${table.columns.length + 1}`];
      const nextRows = table.rows.map((row) => [...row, ""]);
      updateTable({ columns: nextCols, rows: nextRows });
    };

    return (
      <Card className="mb-4 overflow-x-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Table</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addColumn}
            >
              + Column
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
            >
              + Row
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="Delete block"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="inline-block min-w-full border rounded-md overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {table.columns.map((col, colIdx) => (
                    <th
                      key={colIdx}
                      className="border px-2 py-1 font-medium"
                    >
                      <Input
                        className="h-8 text-xs"
                        value={col}
                        onChange={(e) =>
                          updateHeader(colIdx, e.target.value)
                        }
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {table.columns.map((_, colIdx) => (
                      <td
                        key={colIdx}
                        className="border px-2 py-1"
                      >
                        <Input
                          className="h-8 text-xs"
                          value={row[colIdx] ?? ""}
                          onChange={(e) =>
                            updateCell(
                              rowIdx,
                              colIdx,
                              e.target.value
                            )
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {table.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={table.columns.length}
                      className="border px-2 py-4 text-center text-muted-foreground"
                    >
                      No rows yet. Click &quot;+ Row&quot; to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CALENDAR or unknown types -> placeholder
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          {block.type === "calendar" ? "Calendar" : "Block"}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Delete block"
        >
          ✕
        </Button>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {block.type === "calendar"
          ? "Calendar layout placeholder – you can add scheduling/preview UI here later."
          : "Unsupported block type."}
      </CardContent>
    </Card>
  );
});

// ------------------------------------------------------
// Note page
// ------------------------------------------------------

export default function NotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const noteId = params.id;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // blockId -> timeoutId for debounced saves
  const saveTimersRef = useRef<Map<string, number>>(new Map());

  // -------- Load note on mount / id change --------

  useEffect(() => {
    let cancelled = false;

    async function fetchNote() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getNote(noteId);
        if (!cancelled) {
          setNote(data);
        }
      } catch (err) {
        console.error("Failed to load note", err);
        if (!cancelled) {
          setError("Failed to load note");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchNote();

    return () => {
      cancelled = true;
      // clear any pending debounced saves
      const timers = saveTimersRef.current;
      for (const timeoutId of timers.values()) {
        window.clearTimeout(timeoutId);
      }
      timers.clear();
    };
  }, [noteId]);

  // -------- Debounced, optimistic block update --------

  const handleUpdateBlock = useCallback((blockId: string, data: any) => {
    // Optimistic local update
    setNote((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, data } : b
        ),
      };
    });

    // Debounced save to backend
    const timers = saveTimersRef.current;
    const existing = timers.get(blockId);
    if (existing) {
      window.clearTimeout(existing);
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await api.updateBlock(blockId, data);
      } catch (err) {
        console.error("Failed to save block", err);
      }
    }, 400);

    timers.set(blockId, timeoutId);
  }, []);

  // -------- Optimistic block delete --------

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    // Optimistically remove block from state
    setNote((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.filter((b) => b.id !== blockId),
      };
    });

    // Cancel any pending save timers
    const timers = saveTimersRef.current;
    const pending = timers.get(blockId);
    if (pending) {
      window.clearTimeout(pending);
      timers.delete(blockId);
    }

    try {
      await api.deleteBlock(blockId);
    } catch (err) {
      console.error("Failed to delete block", err);
      // optional: refetch note on hard failure
    }
  }, []);

  // -------- Add block helpers (non-optimistic) --------

  const addBlock = useCallback(
    async (type: "text" | "todo" | "table") => {
      if (!note) return;

      const maxPos =
        note.blocks.length > 0
          ? Math.max(...note.blocks.map((b) => b.position))
          : 0;
      const newPos = note.blocks.length > 0 ? maxPos + 1 : 0;

      let initialData: any = {};
      if (type === "text") {
        initialData = { text: "" };
      } else if (type === "todo") {
        initialData = { items: [] as TodoItem[] };
      } else if (type === "table") {
        initialData = {
          columns: ["Column 1", "Column 2"],
          rows: [] as string[][],
        };
      }

      try {
        const created = await api.createBlock(note.id, type, newPos, initialData);
        setNote((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            blocks: [...prev.blocks, created],
          };
        });
      } catch (err) {
        console.error("Failed to add block", err);
      }
    },
    [note]
  );

  const handleAddTextBlock = () => addBlock("text");
  const handleAddTodoBlock = () => addBlock("todo");
  const handleAddTableBlock = () => addBlock("table");

  // -------- Render --------

  if (loading) {
    return <div className="p-4">Loading note…</div>;
  }

  if (error || !note) {
    return (
      <div className="p-4 space-y-2">
        <p>Note not found or failed to load.</p>
        <Button onClick={() => router.push("/")}>Back to notes</Button>
      </div>
    );
  }

  const sortedBlocks = [...note.blocks].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      {/* Top bar with back button + title */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => router.push("/")}>
          ← Back
        </Button>
        <h1 className="text-2xl font-semibold truncate">
          {note.title}
        </h1>
        <div className="w-[88px]" /> {/* spacer */}
      </div>

      {/* Block toolbar */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleAddTextBlock}>
          + Text block
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddTodoBlock}>
          + Todo block
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddTableBlock}>
          + Table block
        </Button>
      </div>

      {/* Blocks list */}
      <div>
        {sortedBlocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            onChange={(data) => handleUpdateBlock(block.id, data)}
            onDelete={() => handleDeleteBlock(block.id)}
          />
        ))}
      </div>
    </div>
  );
}

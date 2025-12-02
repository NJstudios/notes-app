// components/blocks/TodoBlockBody.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Block } from "@/lib/api";

type TodoItem = {
  id: string;
  text: string;
  done: boolean;
};

type Props = {
  block: Block;
  onChange: (data: any) => void;
};

export function TodoBlockBody({ block, onChange }: Props) {
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
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.id)}
              className="h-4 w-4"
            />
            <Input
              className="flex-1"
              value={item.text}
              onChange={(e) => updateItemText(item.id, e.target.value)}
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
    </div>
  );
}

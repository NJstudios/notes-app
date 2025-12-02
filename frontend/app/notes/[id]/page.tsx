// app/notes/[id]/page.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import { api, type Note, type Block } from "@/lib/api";
import { Button } from "@/components/ui/button";

import { BlockCard } from "@/components/blocks/BlockCard";

export default function NotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const noteId = params.id;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // blockId -> timeoutId
  const saveTimersRef = useRef<Map<string, number>>(new Map());

  // ---------- Load note ----------

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
      const timers = saveTimersRef.current;
      for (const id of timers.values()) {
        window.clearTimeout(id);
      }
      timers.clear();
    };
  }, [noteId]);

  // ---------- Debounced, optimistic updateBlock ----------

  const handleUpdateBlock = useCallback((blockId: string, data: any) => {
    // optimistic local update
    setNote((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, data } : b
        ),
      };
    });

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

  // ---------- Optimistic deleteBlock ----------

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    setNote((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.filter((b) => b.id !== blockId),
      };
    });

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
    }
  }, []);

  // ---------- Add block ----------

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
        initialData = { items: [] };
      } else if (type === "table") {
        initialData = {
          columns: ["Column 1", "Column 2"],
          rows: [],
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

  // ---------- Grid layout helper ----------

  const getBlockGridClass = (block: Block) => {
    const size: "full" | "half" = block.data?.layout?.size ?? "full";
    if (size === "half") return "md:col-span-1";
    return "md:col-span-2";
  };

  // ---------- Render ----------

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
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => router.push("/")}>
          ← Back
        </Button>
        <h1 className="text-2xl font-semibold truncate">{note.title}</h1>
        <div className="w-[88px]" />
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

      {/* Grid of blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedBlocks.map((block) => (
          <div key={block.id} className={getBlockGridClass(block)}>
            <BlockCard
              block={block}
              onChange={(data) => handleUpdateBlock(block.id, data)}
              onDelete={() => handleDeleteBlock(block.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

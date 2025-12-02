"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api, Note, Block, BlockType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Status = "idle" | "loading";

export default function NotePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [note, setNote] = useState<Note | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [addingType, setAddingType] = useState<BlockType>("text");

  useEffect(() => {
    (async () => {
      try {
        const n = await api.getNote(id);
        setNote(n);
      } catch (e) {
        console.error(e);
      } finally {
        setStatus("idle");
      }
    })();
  }, [id]);

  if (status === "loading") {
    return <main className="p-8">Loading...</main>;
  }

  if (!note) {
    return <main className="p-8">Note not found.</main>;
  }

  async function handleAddBlock() {
    // guard for TS (runtime we already returned above if note is null)
    if (!note) return;

    const position = note.blocks.length;
    const newBlock = await api.createBlock(
      note.id,
      addingType,
      position,
      defaultDataForType(addingType)
    );

    setNote((prev) => {
      if (!prev) return prev;
      if (prev.id !== note.id) return prev;
      return {
        ...prev,
        blocks: [...prev.blocks, newBlock],
      };
    });
  }

  async function handleUpdateBlock(blockId: string, data: any) {
    if (!note) return;

    const updated = await api.updateBlock(blockId, data);

    setNote((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) => (b.id === blockId ? updated : b)),
      };
    });
  }

  async function handleDeleteBlock(blockId: string) {
    if (!note) return;

    await api.deleteBlock(blockId);

    setNote((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.filter((b) => b.id !== blockId),
      };
    });
  }

  const sortedBlocks = note.blocks
    .slice()
    .sort((a, b) => a.position - b.position);

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/")}>
          ← Back
        </Button>
        <h1 className="text-2xl font-semibold">{note.title}</h1>
      </header>

      {/* Controls to add new blocks */}
      <section className="flex items-center gap-2">
        <Select
          value={addingType}
          onValueChange={(val) => setAddingType(val as BlockType)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Block type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="todo">To-do list</SelectItem>
            <SelectItem value="table">Table</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAddBlock}>Add block</Button>
      </section>

      {/* Blocks */}
      <section className="space-y-4">
        {sortedBlocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            onChange={(data) => handleUpdateBlock(block.id, data)}
            onDelete={() => handleDeleteBlock(block.id)}
          />
        ))}
      </section>
    </main>
  );
}

function defaultDataForType(type: BlockType): any {
  switch (type) {
    case "text":
      return { text: "" };
    case "todo":
      return { items: [{ text: "", done: false }] };
    case "table":
      return {
        headers: ["Column 1", "Column 2", "Column 3"],
        rows: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
      };
    case "calendar":
      return { date: new Date().toISOString() };
  }
}

type BlockCardProps = {
  block: Block;
  onChange: (data: any) => void;
  onDelete: () => void;
};

function BlockCard({ block, onChange, onDelete }: BlockCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium capitalize">
          {block.type} block
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          Remove
        </Button>
      </CardHeader>
      <CardContent>
        {block.type === "text" && (
          <TextBlock data={block.data} onChange={onChange} />
        )}
        {block.type === "todo" && (
          <TodoBlock data={block.data} onChange={onChange} />
        )}
        {block.type === "table" && (
          <TableBlock data={block.data} onChange={onChange} />
        )}
      </CardContent>
    </Card>
  );
}

// ------- Individual block components -------

function TextBlock({
  data,
  onChange,
}: {
  data: { text?: string };
  onChange: (data: any) => void;
}) {
  return (
    <Textarea
      className="min-h-[160px]"
      placeholder="Write your notes here..."
      value={data.text ?? ""}
      onChange={(e) => onChange({ ...data, text: e.target.value })}
    />
  );
}

type TodoData = {
  items: { text: string; done: boolean }[];
};

function TodoBlock({
  data,
  onChange,
}: {
  data: TodoData;
  onChange: (data: any) => void;
}) {
  const items = data.items ?? [];

  function updateItem(
    index: number,
    partial: Partial<TodoData["items"][number]>
  ) {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...partial } : item
    );
    onChange({ ...data, items: next });
  }

  function addItem() {
    onChange({ ...data, items: [...items, { text: "", done: false }] });
  }

  function removeItem(index: number) {
    onChange({ ...data, items: items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) => updateItem(i, { done: e.target.checked })}
          />
          <Input
            placeholder="Task"
            value={item.text}
            onChange={(e) => updateItem(i, { text: e.target.value })}
          />
          <Button variant="ghost" size="sm" onClick={() => removeItem(i)}>
            ✕
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        Add item
      </Button>
    </div>
  );
}

type TableData = {
  headers: string[];
  rows: string[][];
};

function TableBlock({
  data,
  onChange,
}: {
  data: TableData;
  onChange: (data: any) => void;
}) {
  const headers = data.headers ?? [];
  const rows = data.rows ?? [];

  function updateHeader(index: number, value: string) {
    const next = headers.slice();
    next[index] = value;
    onChange({ ...data, headers: next });
  }

  function updateCell(row: number, col: number, value: string) {
    const nextRows = rows.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? value : c)) : r
    );
    onChange({ ...data, rows: nextRows });
  }

  function addRow() {
    const newRow = headers.map(() => "");
    onChange({ ...data, rows: [...rows, newRow] });
  }

  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="min-w-full border border-border text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border border-border p-1">
                <Input
                  className="h-8"
                  value={h}
                  onChange={(e) => updateHeader(i, e.target.value)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border p-1">
                  <Input
                    className="h-8"
                    value={cell}
                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="outline" size="sm" onClick={addRow}>
        Add row
      </Button>
    </div>
  );
}

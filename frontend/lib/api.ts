// lib/api.ts
export type BlockType = "text" | "todo" | "table" | "calendar";

export type Block = {
  id: string;
  type: BlockType;
  position: number;
  data: any;
};

export type Note = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  blocks: Block[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function jsonFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listNotes: () => jsonFetch<Note[]>("/notes"),
  createNote: (title: string) =>
    jsonFetch<Note>("/notes", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  deleteNote: (id: string) =>
    jsonFetch<{ ok: boolean }>(`/notes/${id}`, { method: "DELETE" }),
  getNote: (id: string) => jsonFetch<Note>(`/notes/${id}`),

  createBlock: (noteId: string, type: BlockType, position: number, data: any = {}) =>
    jsonFetch<Block>(`/notes/${noteId}/blocks`, {
      method: "POST",
      body: JSON.stringify({ type, position, data }),
    }),

  updateBlock: (blockId: string, data: any) =>
    jsonFetch<Block>(`/blocks/${blockId}`, {
      method: "PATCH",
      body: JSON.stringify({ data }),
    }),

  deleteBlock: (blockId: string) =>
    jsonFetch<{ ok: boolean }>(`/blocks/${blockId}`, {
      method: "DELETE",
    }),
};

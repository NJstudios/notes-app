"use client";

import { useEffect, useState } from "react";
import { api, Note } from "@/lib/api";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.listNotes();
        setNotes(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreateNote() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const created = await api.createNote(newTitle.trim());
      setNotes((prev) => [created, ...prev]);
      setNewTitle("");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteNote(id: string) {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <main className="min-h-screen p-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notes Dashboard</h1>
      </header>

      <section className="flex items-center gap-2 max-w-xl">
        <Input
          placeholder="New note title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <Button onClick={handleCreateNote} disabled={creating}>
          {creating ? "Creating..." : "Add"}
        </Button>
      </section>

      <section>
        {loading ? (
          <p>Loading...</p>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground">No notes yet. Create one above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="cursor-pointer hover:shadow-md transition"
                onClick={() => router.push(`/notes/${note.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg truncate">{note.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                  >
                    Delete
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(note.updated_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {note.blocks[0]?.data?.text ?? "Empty note"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

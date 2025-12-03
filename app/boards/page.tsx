"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

export default function BoardsPage() {
  const boards = useQuery(api.boards.list);

  if (boards === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-semibold text-gray-900">Please sign in</h1>
          <Link
            href="/sign-in"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return <BoardsContent boards={boards} />;
}

function BoardsContent({
  boards,
}: {
  boards: ReturnType<typeof useQuery<typeof api.boards.list>>;
}) {
  const router = useRouter();
  const createBoard = useMutation(api.boards.create);
  const [isCreating, setIsCreating] = useState(false);
  const [boardName, setBoardName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;
    const boardId = await createBoard({ name: boardName });
    setBoardName("");
    setIsCreating(false);
    router.push(`/boards/${boardId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
            >
              Pushboard
            </Link>
            <Link
              href="/"
              className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Boards</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
          >
            New Board
          </button>
        </div>

        {isCreating && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-lg border bg-white p-4 shadow-sm"
          >
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Board name"
              className="mr-4 flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setBoardName("");
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {boards === undefined ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : boards.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-600">No boards yet. Create your first board!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Link
                key={board._id}
                href={`/boards/${board._id}`}
                className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {board.name}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

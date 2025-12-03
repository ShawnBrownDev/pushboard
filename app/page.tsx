"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function Home() {
  const boards = useQuery(api.boards.list);
  const seedMutation = useMutation(api.seed.seed);

  if (boards === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">Welcome to Pushboard</h1>
          <p className="mb-8 text-gray-600">Please sign in to continue</p>
          <Link
            href="/sign-in"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return <HomeContent boards={boards} seedMutation={seedMutation} />;
}

function HomeContent({
  boards,
  seedMutation,
}: {
  boards: ReturnType<typeof useQuery<typeof api.boards.list>>;
  seedMutation: ReturnType<typeof useMutation<typeof api.seed.seed>>;
}) {
  const handleSeed = async () => {
    await seedMutation({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Pushboard</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/boards"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                My Boards
              </Link>
              {boards && boards.length === 0 && (
                <button
                  onClick={handleSeed}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                >
                  Create Sample Board
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {boards === undefined ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="text-gray-500">Loading boards...</p>
            </div>
          </div>
        ) : boards === null ? (
          <div className="text-center">
            <p className="text-gray-500">Unable to load boards. Please try again.</p>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center">
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">
              Welcome to Pushboard!
            </h2>
            <p className="mt-2 text-gray-600">
              Click &quot;Create Sample Board&quot; to get started, or create a new board from the boards page.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Your Boards
              </h2>
              <Link
                href="/boards"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                View All Boards
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.slice(0, 6).map((board) => (
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
          </div>
        )}
      </main>
    </div>
  );
}

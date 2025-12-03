"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, use, useEffect, } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Id, Doc } from "@/convex/_generated/dataModel";

export default function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = use(params);
  const boardIdTyped = boardId as Id<"boards">;
  const board = useQuery(api.boards.get, { boardId: boardIdTyped });

  if (board === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-semibold">Board not found</h1>
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return <BoardContent boardId={boardIdTyped} />;
}

function BoardContent({ boardId }: { boardId: Id<"boards"> }) {
  const board = useQuery(api.boards.get, { boardId });
  const columns = useQuery(api.columns.list, { boardId });
  const moveTask = useMutation(api.tasks.move);
  const updatePresence = useMutation(api.presence.updatePresence);
  const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);
  const [selectedTask, setSelectedTask] = useState<Id<"tasks"> | null>(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [optimisticTasks, setOptimisticTasks] = useState<Map<Id<"tasks">, { columnId: Id<"columns">; position: number }>>(new Map());

  useEffect(() => {
    if (!board) return;
    
    const update = () => {
      updatePresence({ boardId }).catch(() => {
      });
    };
    
    const interval = setInterval(update, 30000);
    update();
    return () => clearInterval(interval);
  }, [boardId, board, updatePresence]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (board === undefined || columns === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">Board not found</div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(event.active.data.current?.task || null);
  };


  const calculateNewPosition = (
    targetColumnId: Id<"columns">,
    overTaskId?: Id<"tasks">,
    allTasks?: Doc<"tasks">[]
  ): number => {
    if (!allTasks) return 0;

    const tasksInColumn = allTasks.filter((t) => t.columnId === targetColumnId);
    if (tasksInColumn.length === 0) return 0;

    if (overTaskId) {
      const overTask = tasksInColumn.find((t) => t._id === overTaskId);
      if (overTask) {
        return overTask.position;
      }
    }

    return tasksInColumn.length;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      setOptimisticTasks(new Map());
      return;
    }

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    if (activeTaskId === overId) {
      setOptimisticTasks(new Map());
      return;
    }

    const sourceTask = active.data.current?.task;
    if (!sourceTask) {
      setOptimisticTasks(new Map());
      return;
    }

    const targetColumn = columns?.find((col) => col._id === overId);
    if (targetColumn) {
      const newPosition = calculateNewPosition(targetColumn._id);
      setOptimisticTasks(new Map([[sourceTask._id, { columnId: targetColumn._id, position: newPosition }]]));
      
      await moveTask({
        taskId: sourceTask._id as Id<"tasks">,
        newColumnId: targetColumn._id,
        newPosition,
      });
      setOptimisticTasks(new Map());
      return;
    }

    const targetTask = over.data.current?.task;
    if (targetTask) {
      const targetColumnId = targetTask.columnId as Id<"columns">;
      setOptimisticTasks(new Map([[sourceTask._id, { columnId: targetColumnId, position: targetTask.position }]]));
      
      await moveTask({
        taskId: sourceTask._id as Id<"tasks">,
        newColumnId: targetColumnId,
        newPosition: targetTask.position || 0,
      });
      setOptimisticTasks(new Map());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/boards"
                className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
              >
                Pushboard
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h2 className="text-lg font-semibold text-gray-800">{board.name}</h2>
            </div>
            <div className="flex items-center gap-3">
              <BoardMembers boardId={boardId} />
              <button
                onClick={() => setShowActivityFeed(!showActivityFeed)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow transition-all"
              >
                {showActivityFeed ? "Hide" : "Show"} Activity
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          <div className={showActivityFeed ? "flex-1" : "w-full"}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide">
            {columns.map((column) => (
                  <Column
                    key={column._id}
                    column={column}
                    onTaskClick={(taskId) => setSelectedTask(taskId)}
                    optimisticTasks={optimisticTasks}
                  />
                ))}
                <AddColumnButton boardId={boardId} />
          </div>
          <DragOverlay>
            {activeTask ? (
                  <div className="rounded-lg border-2 border-blue-300 bg-white p-4 shadow-xl ring-2 ring-blue-100">
                    <h4 className="font-semibold text-gray-900">{activeTask.title}</h4>
                {activeTask.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{activeTask.description}</p>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
          </div>
          {showActivityFeed && (
            <div className="w-80">
              <ActivityFeed boardId={boardId} />
            </div>
          )}
        </div>
      </main>

      {selectedTask && (
        <TaskDetailsModal
          taskId={selectedTask}
          boardId={boardId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

function Column({
  column,
  onTaskClick,
  optimisticTasks,
}: {
  column: { _id: Id<"columns">; title: string; position: number };
  onTaskClick: (taskId: Id<"tasks">) => void;
  optimisticTasks: Map<Id<"tasks">, { columnId: Id<"columns">; position: number }>;
}) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const tasks = useQuery(api.tasks.list, { columnId: column._id });
  
  const allTasks = useMemo(() => {
    if (!tasks) return [];
    const tasksWithOptimistic = [...tasks];
    optimisticTasks.forEach((optimistic, taskId) => {
      if (optimistic.columnId === column._id) {
        const taskIndex = tasksWithOptimistic.findIndex((t) => t._id === taskId);
        if (taskIndex >= 0) {
          tasksWithOptimistic[taskIndex] = {
            ...tasksWithOptimistic[taskIndex],
            position: optimistic.position,
          };
        }
      }
    });
    return tasksWithOptimistic.sort((a, b) => a.position - b.position);
  }, [tasks, optimisticTasks, column._id]);

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column._id,
  });

  return (
    <div
      ref={setDroppableRef}
      className="min-w-[300px] rounded-xl border border-gray-200 bg-white p-5 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">{column.title}</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {allTasks.length}
        </span>
      </div>

      <SortableContext
        items={allTasks.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[120px]">
          {tasks === undefined ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : allTasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-xl">+</span>
              </div>
              <p className="text-sm font-medium text-gray-400">Drop tasks here</p>
            </div>
          ) : (
            allTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={() => onTaskClick(task._id)}
              />
            ))
          )}
        </div>
      </SortableContext>

      {isAddingTask ? (
        <AddTaskForm
          columnId={column._id}
          onClose={() => setIsAddingTask(false)}
        />
      ) : (
        <button
          onClick={() => setIsAddingTask(true)}
          className="mt-4 w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
        >
          + Add task
        </button>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onClick,
}: {
  task: Doc<"tasks">;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [now] = useState(() => Date.now());
  const isOverdue = task.dueDate ? task.dueDate < now : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="group cursor-grab rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 active:cursor-grabbing transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-gray-900 flex-1 leading-tight">{task.title}</h4>
        {task.labels && task.labels.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {task.labels.slice(0, 2).map((label, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200"
              >
                {label}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="text-xs font-medium text-gray-500">+{task.labels.length - 2}</span>
            )}
          </div>
        )}
      </div>
      {task.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2 leading-relaxed">{task.description}</p>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs">
        {task.dueDate && (
          <span className={`inline-flex items-center gap-1 font-medium ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
            <span>📅</span>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.assigneeId && (
          <span className="ml-auto inline-flex items-center gap-1 text-gray-500">
            <span>👤</span>
            Assigned
          </span>
        )}
      </div>
    </div>
  );
}

function TaskDetailsModal({
  taskId,
  boardId,
  onClose,
}: {
  taskId: Id<"tasks">;
  boardId: Id<"boards">;
  onClose: () => void;
}) {
  const task = useQuery(api.tasks.get, { taskId });
  const comments = useQuery(api.comments.list, { taskId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const board = useQuery(api.boards.get, { boardId });
  const updateTask = useMutation(api.tasks.update);
  const createComment = useMutation(api.comments.create);
  const updateComment = useMutation(api.comments.update);
  const deleteComment = useMutation(api.comments.remove);

  const [title, setTitle] = useState(() => task?.title || "");
  const [description, setDescription] = useState(() => task?.description || "");
  const [assigneeId, setAssigneeId] = useState<string | undefined>(() => task?.assigneeId);
  const [dueDate, setDueDate] = useState<string>(() => task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
  const [newLabel, setNewLabel] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<Id<"comments"> | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  if (!task) {
    return null;
  }

  const boardMembers = board;

  const handleSave = async () => {
    await updateTask({
      taskId,
      title,
      description: description || undefined,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      labels: task.labels || [],
    });
  };

  const handleAddLabel = async () => {
    if (!newLabel.trim()) return;
    const updatedLabels = [...(task.labels || []), newLabel.trim()];
    await updateTask({
      taskId,
      labels: updatedLabels,
    });
    setNewLabel("");
  };

  const handleRemoveLabel = async (labelToRemove: string) => {
    const updatedLabels = (task.labels || []).filter((l) => l !== labelToRemove);
    await updateTask({
      taskId,
      labels: updatedLabels,
    });
  };

  const handleAddComment = async () => {
    if (!commentContent.trim()) return;
    await createComment({
      taskId,
      content: commentContent.trim(),
    });
    setCommentContent("");
  };

  const handleUpdateComment = async (commentId: Id<"comments">) => {
    if (!editingCommentContent.trim()) return;
    await updateComment({
      commentId,
      content: editingCommentContent.trim(),
    });
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleDeleteComment = async (commentId: Id<"comments">) => {
    await deleteComment({ commentId });
  };

  const availableMembers = boardMembers
    ? [boardMembers.ownerId, ...boardMembers.members]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        key={task?._id}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Task Details</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assignee
              </label>
              <select
                value={assigneeId || ""}
                onChange={(e) => {
                  setAssigneeId(e.target.value || undefined);
                  updateTask({
                    taskId,
                    assigneeId: e.target.value || undefined,
                  });
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">Unassigned</option>
                {availableMembers.map((memberId) => (
                  <option key={memberId} value={memberId}>
                    {memberId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  updateTask({
                    taskId,
                    dueDate: e.target.value ? new Date(e.target.value).getTime() : undefined,
                  });
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Labels
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {task.labels?.map((label, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-200"
                >
                  {label}
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="rounded-full hover:bg-blue-100 p-0.5 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                placeholder="Add label"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                onClick={handleAddLabel}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
              >
                Add
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Comments</h3>
            <div className="space-y-4 mb-6">
              {comments?.map((comment) => (
                <div key={comment._id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  {editingCommentId === comment._id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingCommentContent}
                        onChange={(e) => setEditingCommentContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateComment(comment._id)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentContent("");
                          }}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed text-gray-900">{comment.content}</p>
                          <p className="mt-2 text-xs font-medium text-gray-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {comment.authorId === currentUser?.tokenIdentifier && currentUser && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment._id);
                                setEditingCommentContent(comment.content);
                              }}
                              className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentContent.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardMembers({ boardId }: { boardId: Id<"boards"> }) {
  const board = useQuery(api.boards.get, { boardId });
  const presence = useQuery(api.presence.list, { boardId });
  const updatePresence = useMutation(api.presence.updatePresence);

  useEffect(() => {
    if (!board) return;
    
    const update = () => {
      updatePresence({ boardId }).catch(() => {
      });
    };
    
    const interval = setInterval(update, 30000);
    update();
    return () => clearInterval(interval);
  }, [boardId, board, updatePresence]);

  if (!board) return null;

  const allMembers = [board.ownerId, ...board.members];
  const onlineMembers = presence?.filter((p) => p.isOnline).map((p) => p.userId) || [];

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Members</span>
      <div className="flex -space-x-2">
        {allMembers.slice(0, 5).map((memberId) => {
          const isOnline = onlineMembers.includes(memberId);
          const initials = memberId.substring(0, 2).toUpperCase();
          return (
            <div key={memberId} className="relative">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-md ring-2 ring-white"
                title={memberId}
              >
                {initials}
              </div>
              {isOnline && (
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white shadow-sm" />
              )}
            </div>
          );
        })}
        {allMembers.length > 5 && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 ring-2 ring-white shadow-sm">
            +{allMembers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityFeed({ boardId }: { boardId: Id<"boards"> }) {
  const activities = useQuery(api.activities.list, { boardId });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
      <h3 className="mb-5 text-lg font-bold text-gray-900">Activity Feed</h3>
      <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
        {activities === undefined ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-gray-400">No activity yet</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity._id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-medium leading-relaxed text-gray-900">{activity.description}</p>
              <p className="mt-2 text-xs font-semibold text-gray-500">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddColumnButton({ boardId }: { boardId: Id<"boards"> }) {
  const [isAdding, setIsAdding] = useState(false);
  const [columnName, setColumnName] = useState("");
  const columns = useQuery(api.columns.list, { boardId });
  const createColumn = useMutation(api.columns.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnName.trim()) return;
    await createColumn({
      boardId,
      title: columnName,
      position: columns?.length || 0,
    });
    setColumnName("");
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="min-w-[300px] rounded-xl border border-gray-200 bg-white p-5 shadow-md">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Column name"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            autoFocus
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setColumnName("");
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="min-w-[300px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-gray-500 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
    >
      <span className="text-lg font-semibold">+ Add column</span>
    </button>
  );
}

function AddTaskForm({
  columnId,
  onClose,
}: {
  columnId: Id<"columns">;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const tasks = useQuery(api.tasks.list, { columnId });
  const createTask = useMutation(api.tasks.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask({
      columnId,
      title,
      description: description.trim() || undefined,
      position: tasks?.length || 0,
    });
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

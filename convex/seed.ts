import { mutation } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const ownerId = identity?.subject || "anonymous";

    const boardId = await ctx.db.insert("boards", {
      name: "My First Board",
      ownerId,
      members: [],
    });

    const todoColumnId = await ctx.db.insert("columns", {
      boardId,
      title: "To Do",
      position: 0,
    });

    const inProgressColumnId = await ctx.db.insert("columns", {
      boardId,
      title: "In Progress",
      position: 1,
    });

    const doneColumnId = await ctx.db.insert("columns", {
      boardId,
      title: "Done",
      position: 2,
    });

    await ctx.db.insert("tasks", {
      columnId: todoColumnId,
      title: "Welcome to Pushboard!",
      description: "This is your first task. Drag it around to get started.",
      assigneeId: ownerId,
      status: "todo",
      position: 0,
      labels: [],
    });

    await ctx.db.insert("tasks", {
      columnId: todoColumnId,
      title: "Add more tasks",
      description: "Create as many tasks as you need to organize your work.",
      status: "todo",
      position: 1,
      labels: [],
    });

    await ctx.db.insert("tasks", {
      columnId: inProgressColumnId,
      title: "Example in progress task",
      description: "This task is already in progress.",
      status: "in_progress",
      position: 0,
      labels: [],
    });

    await ctx.db.insert("tasks", {
      columnId: doneColumnId,
      title: "Example completed task",
      description: "This task has been completed.",
      status: "done",
      position: 0,
      labels: [],
    });

    return { boardId };
  },
});


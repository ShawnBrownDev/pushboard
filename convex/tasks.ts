import { Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { columnId: v.id("columns") },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) {
      throw new Error("Column not found");
    }
    const board = await ctx.db.get(column.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    return await ctx.db
      .query("tasks")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .order("asc")
      .collect();
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    return task;
  },
});

export const create = mutation({
  args: {
    columnId: v.id("columns"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    position: v.number(),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const column = await ctx.db.get(args.columnId);
    if (!column) {
      throw new Error("Column not found");
    }
    const board = await ctx.db.get(column.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    if (identity) {
      if (
        board.ownerId !== identity.subject &&
        !board.members.includes(identity.subject)
      ) {
        throw new Error("Not authorized");
      }
    }
    
    const taskId = await ctx.db.insert("tasks", {
      columnId: args.columnId,
      title: args.title,
      description: args.description,
      assigneeId: args.assigneeId,
      status: "todo",
      position: args.position,
      dueDate: args.dueDate,
      labels: args.labels || [],
    });

    if (identity) {
      await ctx.db.insert("activities", {
        boardId: board._id,
        taskId,
        userId: identity.subject,
        type: "task_created",
        description: `Created task "${args.title}"`,
        createdAt: Date.now(),
      });
    }
    
    return taskId;
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    columnId: v.optional(v.id("columns")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    status: v.optional(v.string()),
    position: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    const column = await ctx.db.get(task.columnId);
    if (!column) {
      throw new Error("Column not found");
    }
    const board = await ctx.db.get(column.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    if (identity) {
      if (
        board.ownerId !== identity.subject &&
        !board.members.includes(identity.subject)
      ) {
        throw new Error("Not authorized");
      }
    }

    if (args.columnId !== undefined) {
      const newColumn = await ctx.db.get(args.columnId);
      if (!newColumn) {
        throw new Error("Column not found");
      }
      const newBoard = await ctx.db.get(newColumn.boardId);
      if (!newBoard) {
        throw new Error("Board not found");
      }
      
      if (identity) {
        if (
          newBoard.ownerId !== identity.subject &&
          !newBoard.members.includes(identity.subject)
        ) {
          throw new Error("Not authorized");
        }
      }
    }

    const oldTask = await ctx.db.get(args.taskId);
    if (!oldTask) {
      throw new Error("Task not found");
    }

    const updates: Partial<{
      columnId: Id<"columns">;
      title: string;
      description: string | undefined;
      assigneeId: string | undefined;
      status: string;
      position: number;
      dueDate: number | undefined;
      labels: string[];
    }> = {};
    if (args.columnId !== undefined) updates.columnId = args.columnId;
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.status !== undefined) updates.status = args.status;
    if (args.position !== undefined) updates.position = args.position;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.labels !== undefined) updates.labels = args.labels;

    await ctx.db.patch(args.taskId, updates);

    if (identity) {
      const activityDescriptions: string[] = [];
      if (args.title !== undefined && args.title !== oldTask.title) {
        activityDescriptions.push(`Renamed task to "${args.title}"`);
      }
      if (args.description !== undefined && args.description !== oldTask.description) {
        activityDescriptions.push("Updated description");
      }
      if (args.assigneeId !== undefined && args.assigneeId !== oldTask.assigneeId) {
        activityDescriptions.push("Changed assignee");
      }
      if (args.dueDate !== undefined && args.dueDate !== oldTask.dueDate) {
        activityDescriptions.push("Updated due date");
      }
      if (args.labels !== undefined) {
        activityDescriptions.push("Updated labels");
      }

      for (const desc of activityDescriptions) {
        await ctx.db.insert("activities", {
          boardId: board._id,
          taskId: args.taskId,
          userId: identity.subject,
          type: "task_updated",
          description: desc,
          createdAt: Date.now(),
        });
      }
    }

    return await ctx.db.get(args.taskId);
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    const column = await ctx.db.get(task.columnId);
    if (!column) {
      throw new Error("Column not found");
    }
    const board = await ctx.db.get(column.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    if (identity) {
      if (
        board.ownerId !== identity.subject &&
        !board.members.includes(identity.subject)
      ) {
        throw new Error("Not authorized");
      }
    }
    
    await ctx.db.delete(args.taskId);
  },
});

export const move = mutation({
  args: {
    taskId: v.id("tasks"),
    newColumnId: v.id("columns"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const oldColumn = await ctx.db.get(task.columnId);
    if (!oldColumn) {
      throw new Error("Old column not found");
    }
    const oldBoard = await ctx.db.get(oldColumn.boardId);
    if (!oldBoard) {
      throw new Error("Board not found");
    }

    const newColumn = await ctx.db.get(args.newColumnId);
    if (!newColumn) {
      throw new Error("New column not found");
    }
    const newBoard = await ctx.db.get(newColumn.boardId);
    if (!newBoard) {
      throw new Error("New board not found");
    }

    if (identity) {
      if (
        oldBoard.ownerId !== identity.subject &&
        !oldBoard.members.includes(identity.subject)
      ) {
        throw new Error("Not authorized");
      }
      if (
        newBoard.ownerId !== identity.subject &&
        !newBoard.members.includes(identity.subject)
      ) {
        throw new Error("Not authorized");
      }
    }

    const tasksInNewColumn = await ctx.db
      .query("tasks")
      .withIndex("by_column", (q) => q.eq("columnId", args.newColumnId))
      .collect();

    if (task.columnId !== args.newColumnId) {
      for (const t of tasksInNewColumn) {
        if (t.position >= args.newPosition) {
          await ctx.db.patch(t._id, { position: t.position + 1 });
        }
      }

      const tasksInOldColumn = await ctx.db
        .query("tasks")
        .withIndex("by_column", (q) => q.eq("columnId", task.columnId))
        .collect();

      for (const t of tasksInOldColumn) {
        if (t.position > task.position) {
          await ctx.db.patch(t._id, { position: t.position - 1 });
        }
      }
    } else {
      const currentPosition = task.position;
      const newPosition = args.newPosition;

      if (currentPosition < newPosition) {
        for (const t of tasksInNewColumn) {
          if (t._id !== args.taskId && t.position > currentPosition && t.position <= newPosition) {
            await ctx.db.patch(t._id, { position: t.position - 1 });
          }
        }
      } else if (currentPosition > newPosition) {
        for (const t of tasksInNewColumn) {
          if (t._id !== args.taskId && t.position >= newPosition && t.position < currentPosition) {
            await ctx.db.patch(t._id, { position: t.position + 1 });
          }
        }
      }
    }

    await ctx.db.patch(args.taskId, {
      columnId: args.newColumnId,
      position: args.newPosition,
    });

    if (identity) {
      const newColumn = await ctx.db.get(args.newColumnId);
      await ctx.db.insert("activities", {
        boardId: newBoard._id,
        taskId: args.taskId,
        userId: identity.subject,
        type: "task_moved",
        description: `Moved task "${task.title}" to ${newColumn?.title || "new column"}`,
        createdAt: Date.now(),
      });
    }

    return await ctx.db.get(args.taskId);
  },
});

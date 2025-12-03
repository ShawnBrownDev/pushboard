import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    return await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    title: v.string(),
    position: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const board = await ctx.db.get(args.boardId);
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
    
    return await ctx.db.insert("columns", {
      boardId: args.boardId,
      title: args.title,
      position: args.position,
    });
  },
});

export const update = mutation({
  args: {
    columnId: v.id("columns"),
    title: v.optional(v.string()),
    position: v.optional(v.number()),
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
    
    const updates: Partial<{ title: string; position: number }> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.position !== undefined) updates.position = args.position;
    await ctx.db.patch(args.columnId, updates);
    return await ctx.db.get(args.columnId);
  },
});

export const remove = mutation({
  args: { columnId: v.id("columns") },
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

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(args.columnId);
  },
});

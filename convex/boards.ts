import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const allBoards = await ctx.db.query("boards").collect();
    
    if (!identity) {
      return allBoards;
    }
    
    return allBoards.filter(
      (board) =>
        board.ownerId === identity.subject ||
        board.members.includes(identity.subject)
    );
  },
});

export const get = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    return board;
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const ownerId = identity?.subject || "anonymous";
    return await ctx.db.insert("boards", {
      name: args.name,
      ownerId,
      members: [],
    });
  },
});

export const update = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.optional(v.string()),
    members: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    if (identity && board.ownerId !== identity.subject) {
      throw new Error("Not authorized");
    }
    
    type Updates = {
      name?: string;
      members?: string[];
    };
    const updates: Updates = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.members !== undefined) updates.members = args.members;
    await ctx.db.patch(args.boardId, updates);
    return await ctx.db.get(args.boardId);
  },
});

export const remove = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    if (identity && board.ownerId !== identity.subject) {
      throw new Error("Not authorized");
    }

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const column of columns) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_column", (q) => q.eq("columnId", column._id))
        .collect();
      for (const task of tasks) {
        await ctx.db.delete(task._id);
      }
      await ctx.db.delete(column._id);
    }

    await ctx.db.delete(args.boardId);
  },
});

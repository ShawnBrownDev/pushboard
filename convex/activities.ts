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
      .query("activities")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("desc")
      .take(50);
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    taskId: v.optional(v.id("tasks")),
    type: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    if (
      board.ownerId !== identity.subject &&
      !board.members.includes(identity.subject)
    ) {
      throw new Error("Not authorized");
    }
    
    return await ctx.db.insert("activities", {
      boardId: args.boardId,
      taskId: args.taskId,
      userId: identity.subject,
      type: args.type,
      description: args.description,
      createdAt: Date.now(),
    });
  },
});


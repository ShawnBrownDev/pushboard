import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    
    return await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
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
    
    if (
      board.ownerId !== identity.subject &&
      !board.members.includes(identity.subject)
    ) {
      throw new Error("Not authorized");
    }
    
    return await ctx.db.insert("comments", {
      taskId: args.taskId,
      authorId: identity.subject,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }
    
    if (comment.authorId !== identity.subject) {
      throw new Error("Not authorized");
    }
    
    await ctx.db.patch(args.commentId, {
      content: args.content,
    });
    
    return await ctx.db.get(args.commentId);
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }
    
    if (comment.authorId !== identity.subject) {
      throw new Error("Not authorized");
    }
    
    await ctx.db.delete(args.commentId);
  },
});


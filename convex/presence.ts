import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updatePresence = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return null;
    }
    
    if (
      board.ownerId !== identity.subject &&
      !board.members.includes(identity.subject)
    ) {
      return null;
    }
    
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_board", (q) =>
        q.eq("userId", identity.subject).eq("boardId", args.boardId)
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("presence", {
        userId: identity.subject,
        boardId: args.boardId,
        lastSeen: Date.now(),
      });
    }
  },
});

export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    const presenceList = await ctx.db
      .query("presence")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    
    return presenceList
      .filter((p) => p.lastSeen > fiveMinutesAgo)
      .map((p) => ({
        userId: p.userId,
        lastSeen: p.lastSeen,
        isOnline: p.lastSeen > now - 30 * 1000,
      }));
  },
});


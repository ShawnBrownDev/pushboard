import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    
    return user;
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      tokenIdentifier: args.tokenIdentifier,
    });
  },
});


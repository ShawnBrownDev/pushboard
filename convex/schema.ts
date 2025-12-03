import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  boards: defineTable({
    name: v.string(),
    ownerId: v.string(),
    members: v.array(v.string()),
  }),

  columns: defineTable({
    boardId: v.id("boards"),
    title: v.string(),
    position: v.number(),
  }).index("by_board", ["boardId"]).index("by_board_position", ["boardId", "position"]),

  tasks: defineTable({
    columnId: v.id("columns"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    status: v.string(),
    position: v.number(),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  }).index("by_column", ["columnId"]).index("by_column_position", ["columnId", "position"]),

  comments: defineTable({
    taskId: v.id("tasks"),
    authorId: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  activities: defineTable({
    boardId: v.id("boards"),
    taskId: v.optional(v.id("tasks")),
    userId: v.string(),
    type: v.string(),
    description: v.string(),
    createdAt: v.number(),
  }).index("by_board", ["boardId"]).index("by_task", ["taskId"]),

  presence: defineTable({
    userId: v.string(),
    boardId: v.id("boards"),
    lastSeen: v.number(),
  }).index("by_user_board", ["userId", "boardId"]).index("by_board", ["boardId"]),
});


import { mutation } from "./_generated/server";

export const addLabelsToTasks = mutation({
  args: {},
  handler: async (ctx) => {    
    return await ctx.db.query("tasks").collect();
  },
});


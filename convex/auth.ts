import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";

export const http = httpRouter();

export const signIn = httpAction(async (ctx, request) => {
  const { email, password } = await request.json();
  
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ error: "Authentication not configured" }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
});

export default http;


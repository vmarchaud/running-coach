import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { nolioTokens } from "../../db/schema";
import {
  buildAuthorizeUrl,
  exchangeCode,
  refreshTokens,
  getNolioUser,
} from "../lib/nolioClient";

type Bindings = { DB: D1Database; NOLIO_CLIENT_SECRET: string; NOLIO_REDIRECT_URI: string };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/nolio/connect — redirect user to Nolio OAuth
router.get("/connect", async (c) => {
  const userId = c.get("userId");
  // state = userId so we can associate the callback
  const state = btoa(userId);
  const url = buildAuthorizeUrl(c.env.NOLIO_REDIRECT_URI, state);
  return c.redirect(url);
});

// GET /api/nolio/callback — Nolio redirects here after user authorizes
router.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error || !code || !state) {
    return c.html(`<script>window.opener?.postMessage({type:'nolio_error',error:'${error ?? "missing_params"}'},'*');window.close();</script>`);
  }

  let userId: string;
  try {
    userId = atob(state);
  } catch {
    return c.json({ error: "Invalid state" }, 400);
  }

  const tokens = await exchangeCode(code, c.env.NOLIO_REDIRECT_URI, c.env.NOLIO_CLIENT_SECRET);
  const nolioUser = await getNolioUser(tokens.access_token);

  const db = createDb(c.env.DB);
  await db
    .insert(nolioTokens)
    .values({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      nolioUserId: String(nolioUser.id),
      nolioFirstName: nolioUser.first_name,
      nolioLastName: nolioUser.last_name,
    })
    .onConflictDoUpdate({
      target: nolioTokens.userId,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        nolioUserId: String(nolioUser.id),
        nolioFirstName: nolioUser.first_name,
        nolioLastName: nolioUser.last_name,
        updatedAt: new Date().toISOString(),
      },
    });

  return c.html(`<script>window.opener?.postMessage({type:'nolio_connected'},'*');window.close();</script>`);
});

// GET /api/nolio/status — returns connection status + Nolio profile
router.get("/status", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const row = await db
    .select()
    .from(nolioTokens)
    .where(eq(nolioTokens.userId, userId))
    .get();

  if (!row) return c.json({ connected: false });

  // Try to fetch fresh Nolio user data, refresh token if needed
  try {
    const nolioUser = await getNolioUser(row.accessToken);
    return c.json({
      connected: true,
      nolioUser: {
        id: nolioUser.id,
        firstName: nolioUser.first_name,
        lastName: nolioUser.last_name,
        birthday: nolioUser.birthday,
      },
    });
  } catch {
    // Access token likely expired — try refresh
    try {
      const fresh = await refreshTokens(row.refreshToken, c.env.NOLIO_CLIENT_SECRET);
      await db
        .update(nolioTokens)
        .set({
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(nolioTokens.userId, userId));

      const nolioUser = await getNolioUser(fresh.access_token);
      return c.json({
        connected: true,
        nolioUser: {
          id: nolioUser.id,
          firstName: nolioUser.first_name,
          lastName: nolioUser.last_name,
          birthday: nolioUser.birthday,
        },
      });
    } catch {
      // Refresh token also expired — user must reconnect
      await db.delete(nolioTokens).where(eq(nolioTokens.userId, userId));
      return c.json({ connected: false, reason: "token_expired" });
    }
  }
});

// DELETE /api/nolio/disconnect
router.delete("/disconnect", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  await db.delete(nolioTokens).where(eq(nolioTokens.userId, userId));
  return c.json({ ok: true });
});

export default router;

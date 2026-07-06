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

export function nolioUserIdFor(nolioId: string | number): string {
  return `nolio_${nolioId}`;
}

// GET /api/nolio/connect — full-page redirect to Nolio OAuth. This IS the login entry point.
router.get("/connect", async (c) => {
  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(c.env.NOLIO_REDIRECT_URI, state);
  return c.redirect(url);
});

// GET /api/nolio/callback — Nolio redirects here after the user authorizes.
// This is the only sign-in path: the Nolio account IS the app identity.
router.get("/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");

  if (error || !code) {
    return c.redirect(`/?nolioError=${encodeURIComponent(error ?? "missing_code")}`);
  }

  const tokens = await exchangeCode(code, c.env.NOLIO_REDIRECT_URI, c.env.NOLIO_CLIENT_SECRET);
  const nolioUser = await getNolioUser(tokens.access_token);
  const userId = nolioUserIdFor(nolioUser.id);

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

  return c.redirect(`/?nolioUserId=${encodeURIComponent(userId)}`);
});

// GET /api/nolio/status — returns connection status + Nolio profile for the current user.
router.get("/status", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const row = await db
    .select()
    .from(nolioTokens)
    .where(eq(nolioTokens.userId, userId))
    .get();

  if (!row) return c.json({ connected: false });

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
      // Refresh token also expired — user must sign in again
      await db.delete(nolioTokens).where(eq(nolioTokens.userId, userId));
      return c.json({ connected: false, reason: "token_expired" });
    }
  }
});

// DELETE /api/nolio/disconnect — sign out. Removes the stored Nolio session for this user.
router.delete("/disconnect", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  await db.delete(nolioTokens).where(eq(nolioTokens.userId, userId));
  return c.json({ ok: true });
});

export default router;

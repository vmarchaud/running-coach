import { eq } from "drizzle-orm";
import type { Db } from "../../db";
import { nolioTokens } from "../../db/schema";
import { refreshTokens } from "./nolioClient";
import { NolioApiError } from "./nolioApi";

// Runs `fn` with the user's current Nolio access token, transparently refreshing
// and persisting a new token if the call comes back 401.
export async function withNolioToken<T>(
  db: Db,
  userId: string,
  clientSecret: string,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  const row = await db.select().from(nolioTokens).where(eq(nolioTokens.userId, userId)).get();
  if (!row) throw new Error("Not connected to Nolio");

  try {
    return await fn(row.accessToken);
  } catch (e) {
    if (e instanceof NolioApiError && e.status === 401) {
      const fresh = await refreshTokens(row.refreshToken, clientSecret);
      await db
        .update(nolioTokens)
        .set({
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(nolioTokens.userId, userId));
      return await fn(fresh.access_token);
    }
    throw e;
  }
}

// Nolio's write endpoints require an `id_partner` integer. Nolio support confirmed
// it's just an idempotency-style key, not a value assigned per-app — any fixed
// integer works as long as it's stable across requests, so we hardcode one here.
export const NOLIO_PARTNER_ID = 7419283;

// Runs on Cloudflare Workers AI (the `AI` binding) instead of Claude via the AI
// Gateway — Kimi K2.7 supports multi-turn tool calling and is far cheaper per
// token, with light usage covered by Workers AI's free daily allowance.
export const COACH_MODEL = "@cf/moonshotai/kimi-k2.7-code";

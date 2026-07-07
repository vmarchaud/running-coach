// Nolio's write endpoints require an `id_partner` integer. Nolio support confirmed
// it's just an idempotency-style key, not a value assigned per-app — any fixed
// integer works as long as it's stable across requests, so we hardcode one here.
export const NOLIO_PARTNER_ID = 7419283;

export const CF_ACCOUNT_ID = "3c3fe5e5bdd198734e6caf15206507b8";
export const CF_AI_GATEWAY_NAME = "nightly-agents-gateway";
export const CLAUDE_MODEL = "claude-sonnet-4-5";

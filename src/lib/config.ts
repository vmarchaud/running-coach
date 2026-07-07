// Nolio's write endpoints require an `id_partner` integer. Nolio support confirmed
// it's just an idempotency-style key, not a value assigned per-app — any fixed
// integer works as long as it's stable across requests, so we hardcode one here.
export const NOLIO_PARTNER_ID = 7419283;

// Runs on Cloudflare Workers AI (the `AI` binding) instead of Claude via the AI
// Gateway. Kimi K2.7 (1T params) blew through the 10,000/day free neuron
// allocation in a single tool-calling conversation — Workers AI's "neuron" cost
// scales with model size, and our agent loop can make several sequential calls
// per message. This Gemma model is a mixture-of-experts model (26B total, only ~4B
// active per token) with the same tool-calling support and response shape as
// Kimi, at a fraction of the compute cost, so light usage actually fits the
// free tier.
export const COACH_MODEL = "@cf/google/gemma-4-26b-a4b-it";

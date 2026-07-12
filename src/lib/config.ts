// Nolio's write endpoints require an `id_partner` integer. Nolio support confirmed
// it's just an idempotency-style key, not a value assigned per-app — any fixed
// integer works as long as it's stable across requests, so we hardcode one here.
export const NOLIO_PARTNER_ID = 7419283;

// Coach model runs on NVIDIA's hosted inference API (OpenAI-compatible) instead of
// Cloudflare Workers AI — Workers AI's free neuron allocation didn't survive a
// single tool-calling conversation with a large model, and NVIDIA's free tier is
// more generous for this workload.
export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const COACH_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

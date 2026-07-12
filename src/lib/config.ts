// Coach model runs on NVIDIA's hosted inference API (OpenAI-compatible) instead of
// Cloudflare Workers AI — Workers AI's free neuron allocation didn't survive a
// single tool-calling conversation with a large model, and NVIDIA's free tier is
// more generous for this workload.
export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const COACH_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

// VAPID public key for Web Push — safe to expose to the browser (that's the
// point of the VAPID keypair split). Private key is a Worker secret.
export const VAPID_PUBLIC_KEY = "BJvC8h9VQzP7K1BzCzq3Jd7CFi9dVewgVjHO-tYFWXimnnqmyrs8AjdhZj5tBhQzXO4zCOLXJ3Tdr5wckDN58-k";
export const VAPID_SUBJECT = "https://running-coach.vmarchaud.workers.dev";

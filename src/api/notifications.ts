import { api } from "./client";

export const getVapidPublicKey = () => api.get<{ key: string }>("/api/notifications/vapid-public-key");

export const subscribeToPush = (subscription: PushSubscriptionJSON) =>
  api.post<{ ok: boolean }>("/api/notifications/subscribe", subscription);

export const unsubscribeFromPush = (endpoint: string) =>
  api.delete<{ ok: boolean }>("/api/notifications/subscribe", { endpoint });

import { api } from "./client";

export interface NolioStatus {
  connected: boolean;
  reason?: string;
  nolioUser?: {
    id: string | number;
    firstName: string;
    lastName: string;
    birthday: string;
  };
}

export const getNolioStatus = () => api.get<NolioStatus>("/api/nolio/status");
export const disconnectNolio = () => api.delete<{ ok: boolean }>("/api/nolio/disconnect");

// Nolio is the only sign-in mechanism — this is a full-page redirect, not a popup.
export function redirectToNolioLogin(): void {
  window.location.href = "/api/nolio/connect";
}

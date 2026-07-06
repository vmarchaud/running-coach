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

export function openNolioConnect(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `/api/nolio/connect`,
      "nolio-oauth",
      "width=520,height=680,scrollbars=yes"
    );

    // The popup posts a message back when done (see callback route)
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "nolio_connected") {
        window.removeEventListener("message", handler);
        resolve();
      } else if (e.data?.type === "nolio_error") {
        window.removeEventListener("message", handler);
        reject(new Error(e.data.error));
      }
    };
    window.addEventListener("message", handler);

    // Fallback: if popup is closed without a message
    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll);
        window.removeEventListener("message", handler);
        resolve(); // resolve anyway — status check will tell us if it worked
      }
    }, 500);
  });
}

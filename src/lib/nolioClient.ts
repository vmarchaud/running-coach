const BASE = "https://www.nolio.io";
const CLIENT_ID = "nB1TIohzUH5XUyn0H6668RKjzFpWf4jMIakKoQ4L";

export interface NolioTokens {
  access_token: string;
  refresh_token: string;
}

export interface NolioUser {
  id: string | number;
  first_name: string;
  last_name: string;
  birthday: string;
}

function basicAuth(clientSecret: string): string {
  return "Basic " + btoa(`${CLIENT_ID}:${clientSecret}`);
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
  clientSecret: string
): Promise<NolioTokens> {
  const res = await fetch(`${BASE}/api/token/`, {
    method: "POST",
    headers: {
      "Authorization": basicAuth(clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nolio token exchange failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function refreshTokens(
  refreshToken: string,
  clientSecret: string
): Promise<NolioTokens> {
  const res = await fetch(`${BASE}/api/token/`, {
    method: "POST",
    headers: {
      "Authorization": basicAuth(clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nolio token refresh failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getNolioUser(accessToken: string): Promise<NolioUser> {
  const res = await fetch(`${BASE}/api/get/user/`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nolio get user failed ${res.status}: ${text}`);
  }
  return res.json();
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    state,
  });
  return `${BASE}/api/authorize/?${params}`;
}

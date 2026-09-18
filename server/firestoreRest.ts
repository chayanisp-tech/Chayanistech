import { createSign } from "node:crypto";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

const base64Url = (value: string): string =>
  Buffer.from(value).toString("base64url");

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");

  const account = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!account.client_email || !account.private_key || !account.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is incomplete");
  }

  return account as ServiceAccount;
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedJwt = header + "." + claims;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const assertion = unsignedJwt + "." + signer.sign(account.private_key, "base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) throw new Error("Unable to authenticate scoring service");
  const body = await response.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
  return cachedToken.value;
}

function decodeValue(value: any): any {
  if (value === undefined) return undefined;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)])
  );
}

export async function getServerDocument(
  collection: string,
  documentId: string
): Promise<Record<string, any> | null> {
  const account = getServiceAccount();
  const token = await getAccessToken(account);
  const databaseId = process.env.FIREBASE_DATABASE_ID || "(default)";
  const path = [collection, documentId].map(encodeURIComponent).join("/");
  const url = "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(account.project_id) +
    "/databases/" + encodeURIComponent(databaseId) +
    "/documents/" + path;
  const response = await fetch(url, {
    headers: { authorization: "Bearer " + token },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to read answer key");
  const document = await response.json() as { fields?: Record<string, any> };
  return decodeFields(document.fields || {});
}

import { JWT } from "google-auth-library";
import { gaEnv } from "./env";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

let authClient: JWT | undefined;

// Reused across calls so google-auth-library can cache the access token
// between requests instead of re-signing a JWT every time.
export function getAuthClient(): JWT {
  authClient ??= new JWT({
    email: gaEnv.serviceAccountEmail,
    key: gaEnv.privateKey,
    scopes: SCOPES,
  });
  return authClient;
}

import { z } from "zod";

const rawEnv = z
  .object({
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
    GOOGLE_PRIVATE_KEY: z.string().min(1),
    GSC_SITE_URL: z.string().url(),
  })
  .parse({
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    GSC_SITE_URL: process.env.GSC_SITE_URL,
  });

export const gscEnv = {
  serviceAccountEmail: rawEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  // See google-analytics/env.ts for why this replace is required on
  // Vercel and a no-op locally.
  privateKey: rawEnv.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  siteUrl: rawEnv.GSC_SITE_URL,
};

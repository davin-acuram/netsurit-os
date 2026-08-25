import { z } from "zod";

const rawEnv = z
  .object({
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
    GOOGLE_PRIVATE_KEY: z.string().min(1),
    GA4_PROPERTY_ID: z.string().regex(/^\d+$/, "GA4_PROPERTY_ID must be numeric only"),
  })
  .parse({
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
  });

export const gaEnv = {
  serviceAccountEmail: rawEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  // Vercel stores env values byte-for-byte (no escape expansion), so the
  // literal \n written to .env.local survives as-is there. Next.js's own
  // .env loader already expands \n inside double-quoted values locally, so
  // this replace is a no-op in that case and required in Vercel's.
  privateKey: rawEnv.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  propertyId: rawEnv.GA4_PROPERTY_ID,
};

import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Placeholder table to confirm migrations run end to end. Replaced by the
// real GA4/GSC schema in the data-source phase.
export const scaffoldCheck = pgTable("scaffold_check", {
  id: serial("id").primaryKey(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

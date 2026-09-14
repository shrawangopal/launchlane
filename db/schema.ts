import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const launches = sqliteTable(
  "launches",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    portalHash: text("portal_hash").notNull(),
    revision: integer("revision").notNull().default(0),
    createdAt: text("created_at").notNull(),
    body: text("body").notNull(),
  },
  (t) => [
    index("idx_launches_owner_created").on(t.owner, t.createdAt),
    uniqueIndex("idx_launches_portal_hash").on(t.portalHash),
  ],
);

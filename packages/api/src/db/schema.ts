import { pgTable, uuid, text, boolean, timestamp, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: text("text").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    textLength: check("text_length_chk", sql`length(${t.text}) BETWEEN 1 AND 500`),
    createdAtIdx: index("idx_todos_created_at").on(t.createdAt.desc()),
  }),
);

export type TodoRow = typeof todos.$inferSelect;
export type NewTodoRow = typeof todos.$inferInsert;

import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Closure records maintained by the CRC team. */
export const closures = mysqlTable("closures", {
  id: int("id").autoincrement().primaryKey(),
  crcName: varchar("crcName", { length: 32 }).notNull(),
  patientName: varchar("patientName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  closingDate: varchar("closingDate", { length: 10 }).notNull(),
  closedItem: text("closedItem").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Closure = typeof closures.$inferSelect;
export type InsertClosure = typeof closures.$inferInsert;

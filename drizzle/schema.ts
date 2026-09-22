import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  origin: varchar("origin", { length: 160 }),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }),
  weeklyGoal: decimal("weeklyGoal", { precision: 12, scale: 2 }).notNull().default("37500.00"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export const closures = mysqlTable("closures", {
  id: int("id").autoincrement().primaryKey(),
  crcName: varchar("crcName", { length: 32 }).notNull(),
  patientName: varchar("patientName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  closingDate: varchar("closingDate", { length: 10 }).notNull(),
  closedItem: text("closedItem").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  totalTimeSeconds: int("totalTimeSeconds").notNull().default(0),
  internalStatus: mysqlEnum("internalStatus", ["closed", "follow_up", "not_closed"]).notNull().default("closed"),
  internalNotes: text("internalNotes"),
  nextStep: text("nextStep"),
  internalClosingDate: varchar("internalClosingDate", { length: 10 }),
  campaignId: int("campaignId"),
  leadOrigin: varchar("leadOrigin", { length: 160 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Closure = typeof closures.$inferSelect;
export type InsertClosure = typeof closures.$inferInsert;

export const crcWeeklyActivities = mysqlTable("crc_weekly_activities", {
  id: int("id").autoincrement().primaryKey(),
  crcName: varchar("crcName", { length: 32 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  week: int("week").notNull(),
  taskCount: int("taskCount").notNull().default(0),
  description: text("description").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("crc_weekly_activities_crc_month_week_unique").on(table.crcName, table.month, table.week),
]);

export type CrcWeeklyActivity = typeof crcWeeklyActivities.$inferSelect;
export type InsertCrcWeeklyActivity = typeof crcWeeklyActivities.$inferInsert;

export const crcWeeklyAppointments = mysqlTable("crc_weekly_appointments", {
  id: int("id").autoincrement().primaryKey(),
  crcName: varchar("crcName", { length: 32 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  week: int("week").notNull(),
  appointmentCount: int("appointmentCount").notNull().default(0),
  weeklyGoal: int("weeklyGoal").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("crc_weekly_appointments_crc_month_week_unique").on(table.crcName, table.month, table.week),
]);

export type CrcWeeklyAppointment = typeof crcWeeklyAppointments.$inferSelect;
export type InsertCrcWeeklyAppointment = typeof crcWeeklyAppointments.$inferInsert;

export const valSales = mysqlTable("val_sales", {
  id: int("id").autoincrement().primaryKey(),
  saleDate: varchar("saleDate", { length: 10 }).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  totalTimeSeconds: int("totalTimeSeconds").notNull().default(0),
  insurancePlan: varchar("insurancePlan", { length: 40 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ValSale = typeof valSales.$inferSelect;
export type InsertValSale = typeof valSales.$inferInsert;

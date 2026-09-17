import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing auth flow. */
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

/** Intake details captured by the CRC after a first consultation is scheduled. */
export const patientIntakes = mysqlTable("patient_intakes", {
  id: int("id").autoincrement().primaryKey(),
  patientName: varchar("patientName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  firstConsultationRequest: text("firstConsultationRequest").notNull(),
  scheduledDate: varchar("scheduledDate", { length: 10 }).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PatientIntake = typeof patientIntakes.$inferSelect;
export type InsertPatientIntake = typeof patientIntakes.$inferInsert;

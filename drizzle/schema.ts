import { bigint, boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

/** Uma foto profissional por CRC, independente do mês de apuração. */
export const crcProfiles = mysqlTable("crc_profiles", {
  crcName: varchar("crcName", { length: 32 }).primaryKey(),
  photoKey: varchar("photoKey", { length: 512 }).notNull(),
  photoUrl: varchar("photoUrl", { length: 768 }).notNull(),
  updatedBy: int("updatedBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrcProfile = typeof crcProfiles.$inferSelect;

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

/** IDs nunca mudam quando o nome ou a foto são corrigidos. VAL preserva Vivi. */
export const odontomabCrcs = mysqlTable("odontomab_crcs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 160 }).notNull().unique(),
  photoKey: varchar("photoKey", { length: 512 }),
  photoUrl: varchar("photoUrl", { length: 768 }),
  isActive: boolean("isActive").notNull().default(true),
  removedBy: int("removedBy"),
  removedAt: timestamp("removedAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const valSales = mysqlTable("val_sales", {
  id: int("id").autoincrement().primaryKey(),
  crcId: varchar("crcId", { length: 32 }).notNull().default("VAL"),
  patientName: varchar("patientName", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  patientType: mysqlEnum("patientType", ["active", "new"]),
  internalStatus: mysqlEnum("internalStatus", ["closed", "not_closed", "follow_up"]).notNull().default("closed"),
  photoKey: varchar("photoKey", { length: 512 }),
  photoUrl: varchar("photoUrl", { length: 768 }),
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

/** Módulo independente: Pacientes Ativos Orto Implante. Não mistura registros com closures/campaigns. */
export const orthoActiveCampaigns = mysqlTable("ortho_active_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  origin: varchar("origin", { length: 160 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }),
  weeklyGoal: decimal("weeklyGoal", { precision: 12, scale: 2 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrthoActiveCampaign = typeof orthoActiveCampaigns.$inferSelect;
export type InsertOrthoActiveCampaign = typeof orthoActiveCampaigns.$inferInsert;

export const orthoActivePatients = mysqlTable("ortho_active_patients", {
  id: int("id").autoincrement().primaryKey(),
  crcName: varchar("crcName", { length: 32 }).notNull(),
  patientName: varchar("patientName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  contactChannel: mysqlEnum("contactChannel", ["WhatsApp", "Ligação", "Presencial", "Instagram"]),
  reference: varchar("reference", { length: 160 }),
  closingDate: varchar("closingDate", { length: 10 }).notNull(),
  closedItem: text("closedItem").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  totalTimeSeconds: int("totalTimeSeconds").notNull().default(0),
  internalStatus: mysqlEnum("internalStatus", ["closed", "follow_up", "not_closed"]).notNull().default("closed"),
  internalNotes: text("internalNotes"),
  campaignId: int("campaignId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrthoActivePatient = typeof orthoActivePatients.$inferSelect;
export type InsertOrthoActivePatient = typeof orthoActivePatients.$inferInsert;

/** Nenhuma meta numérica é presumida; a gerência configura por pessoa e por mês. */
export const orthoActiveGoals = mysqlTable("ortho_active_goals", {
  id: int("id").autoincrement().primaryKey(),
  crcName: varchar("crcName", { length: 32 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  monthlyGoal: decimal("monthlyGoal", { precision: 12, scale: 2 }),
  weeklySalesGoal: decimal("weeklySalesGoal", { precision: 12, scale: 2 }),
  timeGoalSeconds: int("timeGoalSeconds"),
  updatedBy: int("updatedBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("ortho_active_goals_crc_month_unique").on(table.crcName, table.month)]);
export type OrthoActiveGoal = typeof orthoActiveGoals.$inferSelect;

export const orthoActiveWeekly = mysqlTable("ortho_active_weekly", {
  id: int("id").autoincrement().primaryKey(),
  crcName: varchar("crcName", { length: 32 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  week: int("week").notNull(),
  taskCount: int("taskCount").notNull().default(0),
  taskGoal: int("taskGoal"),
  description: text("description"),
  appointmentCount: int("appointmentCount").notNull().default(0),
  appointmentGoal: int("appointmentGoal"),
  updatedBy: int("updatedBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("ortho_active_weekly_crc_month_week_unique").on(table.crcName, table.month, table.week)]);
export type OrthoActiveWeek = typeof orthoActiveWeekly.$inferSelect;

/** Retirada independente em cada página Orto Implante; nunca altera o retrato. */
export const ortoCrcStates = mysqlTable("orto_crc_states", {
  id: int("id").autoincrement().primaryKey(),
  scope: mysqlEnum("scope", ["funnel", "ortho_active"]).notNull(),
  crcId: varchar("crcId", { length: 32 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  removedBy: int("removedBy"),
  removedAtMs: bigint("removedAtMs", { mode: "number" }),
}, table => [uniqueIndex("orto_crc_states_scope_crc_unique").on(table.scope, table.crcId)]);

/** Histórico de atribuição: origem, destino e IDs preservados de cada transferência. */
export const crcTransfers = mysqlTable("crc_transfers", {
  id: int("id").autoincrement().primaryKey(),
  scope: mysqlEnum("scope", ["funnel", "ortho_active", "odontomab"]).notNull(),
  sourceId: varchar("sourceId", { length: 32 }).notNull(),
  targetId: varchar("targetId", { length: 32 }).notNull(),
  sourceName: varchar("sourceName", { length: 160 }).notNull(),
  targetName: varchar("targetName", { length: 160 }).notNull(),
  recordCount: int("recordCount").notNull(),
  totalValue: decimal("totalValue", { precision: 16, scale: 2 }).notNull(),
  recordIds: text("recordIds").notNull(),
  performedBy: int("performedBy").notNull(),
  performedAtMs: bigint("performedAtMs", { mode: "number" }).notNull(),
});

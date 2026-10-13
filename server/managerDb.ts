import { listCrcWeeklyActivities, listCrcWeeklyAppointments, listClosures, listValSales } from "./db";
import { listOdontomabCrcs } from "./odontomabCrcDb";
import { listActiveGoals, listActivePatients, listActiveWeeks } from "./orthoActiveDb";
import { listManagerAudit } from "./managerAuditDb";

const marketingCrcs = ["WISLLAYNI", "JAYZA"] as const;

export async function getManagerDashboard(month: string) {
  const [closures, sharedTasks, sharedAppointments, activePatients, activeGoals, activeWeeks, odontomabSales, odontomabCrcs, audit] = await Promise.all([
    listClosures(month),
    listCrcWeeklyActivities(month),
    listCrcWeeklyAppointments(month),
    listActivePatients(month),
    listActiveGoals(month),
    listActiveWeeks(month),
    listValSales(month),
    listOdontomabCrcs(),
    listManagerAudit(month),
  ]);
  const odontomabIds = new Set(odontomabCrcs.map(crc => crc.id));
  return {
    month,
    marketing: {
      records: closures.map(row => ({ patientName: row.patientName, phone: row.phone, closingDate: row.closingDate, closedItem: row.closedItem, value: row.value, totalTimeSeconds: row.totalTimeSeconds, internalStatus: row.internalStatus, internalNotes: row.internalNotes, crcName: row.crcName })),
      tasks: sharedTasks.filter(row => marketingCrcs.includes(row.crcName as typeof marketingCrcs[number])).map(row => ({ crcName: row.crcName, week: row.week, taskCount: row.taskCount, description: row.description })),
      appointments: sharedAppointments.filter(row => marketingCrcs.includes(row.crcName as typeof marketingCrcs[number])).map(row => ({ crcName: row.crcName, week: row.week, appointmentCount: row.appointmentCount, weeklyGoal: row.weeklyGoal })),
    },
    ortho: {
      records: activePatients.map(row => ({ patientName: row.patientName, phone: row.phone, closingDate: row.closingDate, closedItem: row.closedItem, value: row.value, totalTimeSeconds: row.totalTimeSeconds, internalStatus: row.internalStatus, internalNotes: row.internalNotes, crcName: row.crcName })),
      goals: activeGoals.map(row => ({ crcName: row.crcName, monthlyGoal: row.monthlyGoal })),
      weekly: activeWeeks.map(row => ({ crcName: row.crcName, week: row.week, taskCount: row.taskCount, taskGoal: row.taskGoal, description: row.description, appointmentCount: row.appointmentCount, appointmentGoal: row.appointmentGoal })),
    },
    odontomab: {
      crcs: odontomabCrcs,
      records: odontomabSales.map(row => ({ patientName: row.patientName, phone: row.phone, closingDate: row.saleDate, closedItem: row.treatment, value: row.value, totalTimeSeconds: row.totalTimeSeconds, internalStatus: row.internalStatus, internalNotes: row.notes, crcId: row.crcId })),
      tasks: sharedTasks.filter(row => odontomabIds.has(row.crcName)).map(row => ({ crcId: row.crcName, week: row.week, taskCount: row.taskCount, description: row.description })),
      appointments: sharedAppointments.filter(row => odontomabIds.has(row.crcName)).map(row => ({ crcId: row.crcName, week: row.week, appointmentCount: row.appointmentCount, weeklyGoal: row.weeklyGoal })),
    },
    audit,
  };
}

export const CRC_QUALITY_MAX_POINTS = {
  sales: 50,
  tasks: 15,
  responses: 15,
  appointments: 10,
  records: 10,
} as const;

export type QualityClosure = {
  patientName?: string | null;
  phone?: string | null;
  closingDate: string;
  closedItem?: string | null;
  value: string | number;
  totalTimeSeconds: number;
  internalStatus?: string | null;
  internalNotes?: string | null;
};

export type QualityTask = { taskCount: number; description?: string | null };
export type QualityAppointment = { appointmentCount: number; weeklyGoal: number };

const percentage = (value: number, denominator: number) => denominator > 0 ? Math.min(100, (value / denominator) * 100) : 0;
const points = (percent: number, maximum: number) => Math.round((percent / 100) * maximum * 10) / 10;

export function calculateCrcQualityScore({ revenue, salesGoal = 75_000, closures, tasks, appointments }: {
  revenue: number;
  salesGoal?: number;
  closures: QualityClosure[];
  tasks: QualityTask[];
  appointments: QualityAppointment[];
}) {
  const validTasks = tasks.filter(task => (task.description ?? "").trim().length >= 2).reduce((sum, task) => sum + task.taskCount, 0);
  const taskPercent = percentage(validTasks, 500);
  const measuredResponses = closures.filter(closure => closure.totalTimeSeconds > 0);
  const fastResponses = measuredResponses.filter(closure => closure.totalTimeSeconds <= 120).length;
  const responsePercent = percentage(fastResponses, measuredResponses.length);
  const appointmentGoal = appointments.reduce((sum, record) => sum + record.weeklyGoal, 0);
  const appointmentCount = appointments.reduce((sum, record) => sum + record.appointmentCount, 0);
  const appointmentPercent = percentage(appointmentCount, appointmentGoal);
  const validRecords = closures.filter(closure => Boolean(
    closure.patientName?.trim() && closure.phone?.trim() && closure.closingDate && closure.closedItem?.trim() &&
    Number(closure.value) > 0 && closure.internalStatus && closure.internalNotes?.trim(),
  )).length;
  const recordPercent = percentage(validRecords, closures.length);
  const salesPercent = percentage(revenue, salesGoal);
  const categories = {
    sales: { percent: salesPercent, points: points(salesPercent, CRC_QUALITY_MAX_POINTS.sales) },
    tasks: { percent: taskPercent, points: points(taskPercent, CRC_QUALITY_MAX_POINTS.tasks) },
    responses: { percent: responsePercent, points: points(responsePercent, CRC_QUALITY_MAX_POINTS.responses) },
    appointments: { percent: appointmentPercent, points: points(appointmentPercent, CRC_QUALITY_MAX_POINTS.appointments) },
    records: { percent: recordPercent, points: points(recordPercent, CRC_QUALITY_MAX_POINTS.records) },
  };
  const totalPoints = Math.round(Object.values(categories).reduce((sum, category) => sum + category.points, 0) * 10) / 10;
  return {
    categories,
    totalPoints,
    maxPoints: 100,
    remainingPoints: Math.max(0, Math.round((100 - totalPoints) * 10) / 10),
    revenue,
    validTasks,
    fastResponses,
    measuredResponses: measuredResponses.length,
    appointmentCount,
    appointmentGoal,
    validRecords,
  };
}

export const MANAGER_MAX_POINTS = {
  sales: 50,
  tasks: 20,
  responses: 5,
  appointments: 20,
  records: 5,
} as const;
export const MANAGER_TOTAL_SALES_GOAL = 400_000;

export type ManagerRecord = {
  patientName?: string | null;
  phone?: string | null;
  closingDate?: string | null;
  closedItem?: string | null;
  value: string | number;
  totalTimeSeconds: number;
  internalStatus?: string | null;
  internalNotes?: string | null;
};

export type ManagerTask = {
  taskCount: number;
  description?: string | null;
};

export type ManagerAppointment = {
  appointmentCount: number;
  weeklyGoal: number;
};

export type ManagerScore = {
  categories: {
    sales: { percent: number; points: number };
    tasks: { percent: number; points: number };
    responses: { percent: number; points: number };
    appointments: { percent: number; points: number };
    records: { percent: number; points: number };
  };
  totalPoints: number;
  maxPoints: 100;
  remainingPoints: number;
  revenue: number;
  salesGoal: number | null;
  validTasks: number;
  taskGoal: number;
  fastResponses: number;
  measuredResponses: number;
  appointmentCount: number;
  appointmentGoal: number;
  validRecords: number;
  recordCount: number;
  responseApplicable: boolean;
};

const percentage = (value: number, denominator: number) => denominator > 0 ? Math.min(100, (value / denominator) * 100) : 0;
const points = (percent: number, maximum: number) => Math.round((percent / 100) * maximum * 10) / 10;
const closed = (record: ManagerRecord) => !record.internalStatus || record.internalStatus === "closed";

export function calculateManagerScore({ revenue, salesGoal, records, tasks, appointments, taskGoal = 500, responseApplicable = true }: {
  revenue: number;
  salesGoal: number | null;
  records: ManagerRecord[];
  tasks: ManagerTask[];
  appointments: ManagerAppointment[];
  taskGoal?: number;
  responseApplicable?: boolean;
}): ManagerScore {
  const operationalRecords = records.filter(closed);
  const validTasks = tasks
    .filter(task => (task.description ?? "").trim().length >= 2)
    .reduce((sum, task) => sum + task.taskCount, 0);
  const measuredResponses = operationalRecords.filter(record => record.totalTimeSeconds > 0);
  const fastResponses = measuredResponses.filter(record => record.totalTimeSeconds <= 120).length;
  const appointmentGoal = appointments.reduce((sum, record) => sum + Math.max(0, record.weeklyGoal), 0);
  const appointmentCount = appointments.reduce((sum, record) => sum + Math.max(0, record.appointmentCount), 0);
  const validRecords = operationalRecords.filter(record => Boolean(
    record.patientName?.trim() && record.phone?.trim() && record.closingDate && record.closedItem?.trim() &&
    Number(record.value) > 0 && record.internalStatus !== "follow_up" && record.internalStatus !== "not_closed" && record.internalNotes?.trim(),
  )).length;
  const revenueTotal = revenue;
  const categories = {
    sales: { percent: salesGoal && salesGoal > 0 ? percentage(revenueTotal, salesGoal) : 0, points: points(salesGoal && salesGoal > 0 ? percentage(revenueTotal, salesGoal) : 0, MANAGER_MAX_POINTS.sales) },
    tasks: { percent: percentage(validTasks, taskGoal), points: points(percentage(validTasks, taskGoal), MANAGER_MAX_POINTS.tasks) },
    responses: { percent: responseApplicable ? percentage(fastResponses, measuredResponses.length) : 0, points: responseApplicable ? points(percentage(fastResponses, measuredResponses.length), MANAGER_MAX_POINTS.responses) : 0 },
    appointments: { percent: percentage(appointmentCount, appointmentGoal), points: points(percentage(appointmentCount, appointmentGoal), MANAGER_MAX_POINTS.appointments) },
    records: { percent: percentage(validRecords, operationalRecords.length), points: points(percentage(validRecords, operationalRecords.length), MANAGER_MAX_POINTS.records) },
  };
  const totalPoints = Math.round(Object.values(categories).reduce((sum, category) => sum + category.points, 0) * 10) / 10;
  return {
    categories,
    totalPoints,
    maxPoints: 100,
    remainingPoints: Math.max(0, Math.round((100 - totalPoints) * 10) / 10),
    revenue: revenueTotal,
    salesGoal,
    validTasks,
    taskGoal,
    fastResponses,
    measuredResponses: measuredResponses.length,
    appointmentCount,
    appointmentGoal,
    validRecords,
    recordCount: operationalRecords.length,
    responseApplicable,
  };
}

export function averageManagerScores(scores: ManagerScore[]): ManagerScore {
  if (!scores.length) {
    return calculateManagerScore({ revenue: 0, salesGoal: null, records: [], tasks: [], appointments: [] });
  }
  const average = (selector: (score: ManagerScore) => number) => Math.round(scores.reduce((sum, score) => sum + selector(score), 0) / scores.length * 10) / 10;
  const responseScores = scores.filter(score => score.responseApplicable);
  const averageResponse = (selector: (score: ManagerScore) => number) => responseScores.length ? Math.round(responseScores.reduce((sum, score) => sum + selector(score), 0) / responseScores.length * 10) / 10 : 0;
  const categories = {
    sales: { percent: average(score => score.categories.sales.percent), points: average(score => score.categories.sales.points) },
    tasks: { percent: average(score => score.categories.tasks.percent), points: average(score => score.categories.tasks.points) },
    responses: { percent: averageResponse(score => score.categories.responses.percent), points: averageResponse(score => score.categories.responses.points) },
    appointments: { percent: average(score => score.categories.appointments.percent), points: average(score => score.categories.appointments.points) },
    records: { percent: average(score => score.categories.records.percent), points: average(score => score.categories.records.points) },
  };
  const totalPoints = Math.round(Object.values(categories).reduce((sum, category) => sum + category.points, 0) * 10) / 10;
  return {
    categories,
    totalPoints,
    maxPoints: 100,
    remainingPoints: Math.max(0, Math.round((100 - totalPoints) * 10) / 10),
    revenue: scores.reduce((sum, score) => sum + score.revenue, 0),
    salesGoal: scores.reduce((sum, score) => sum + (score.salesGoal ?? 0), 0) || null,
    validTasks: scores.reduce((sum, score) => sum + score.validTasks, 0),
    taskGoal: scores.reduce((sum, score) => sum + score.taskGoal, 0),
    fastResponses: scores.reduce((sum, score) => sum + score.fastResponses, 0),
    measuredResponses: scores.reduce((sum, score) => sum + score.measuredResponses, 0),
    appointmentCount: scores.reduce((sum, score) => sum + score.appointmentCount, 0),
    appointmentGoal: scores.reduce((sum, score) => sum + score.appointmentGoal, 0),
    validRecords: scores.reduce((sum, score) => sum + score.validRecords, 0),
    recordCount: scores.reduce((sum, score) => sum + score.recordCount, 0),
    responseApplicable: scores.some(score => score.responseApplicable),
  };
}

export const TASK_STATUSES = {
  PENDING: "pending",
  READY_TO_CHECK: "ready-to-check",
  COMPLETED: "completed",
  BACKLOG: "backlog",
} as const;

export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES];

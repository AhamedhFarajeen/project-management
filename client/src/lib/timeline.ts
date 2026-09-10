import type { Project, Task } from "@/state/api";

export type TimelineRecord = {
  id: number | string;
  text: string;
  start: Date;
  end: Date;
  type: "task" | "summary";
  progress: number;
};

const range = (startValue?: string, endValue?: string) => {
  if (!startValue || !endValue) return null;
  const start = new Date(startValue);
  const end = new Date(endValue);
  return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end ? null : { start, end };
};

export const projectTimelineRecord = (project: Project): TimelineRecord | null => {
  const dates = range(project.startDate, project.endDate);
  return dates ? { ...dates, id: `Project-${project.id}`, text: project.name, type: "summary", progress: 50 } : null;
};

export const taskTimelineRecord = (task: Task): TimelineRecord | null => {
  const dates = range(task.startDate, task.dueDate);
  return dates ? { ...dates, id: `Task-${task.id}`, text: task.title, type: "task", progress: task.points ? (task.points / 10) * 100 : 0 } : null;
};

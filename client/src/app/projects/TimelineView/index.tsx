import { useGetTasksQuery } from "@/state/api";
import { Gantt } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { taskTimelineRecord } from "@/lib/timeline";
import React, { useMemo } from "react";

type Props = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const Timeline = ({ id, setIsModalNewTaskOpen }: Props) => {
  const {
    data: tasks,
    error,
    isLoading,
  } = useGetTasksQuery({ projectId: Number(id) });

  const ganttTasks = useMemo(() => {
    return tasks?.flatMap((task) => { const item = taskTimelineRecord(task); return item ? [item] : []; }) || [];
  }, [tasks]);

  if (isLoading) return <div>Loading...</div>;
  if (error || !tasks) return <div>An error occurred while fetching tasks</div>;

  const invalidCount = tasks.length - ganttTasks.length;

  return (
    <div className="px-4 xl:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 py-5">
        <h1 className="me-2 text-lg font-bold dark:text-white">
          Project Tasks Timeline
        </h1>
      </div>

      <div className="overflow-hidden rounded-md bg-white shadow dark:bg-dark-secondary dark:text-white">
        {ganttTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-neutral-400">No tasks with valid start and due dates to display.</div>
        ) : (
        <div className="timeline">
          <Gantt tasks={ganttTasks} readonly cellBorders="full" />
        </div>
        )}
        {invalidCount > 0 && ganttTasks.length > 0 && <p className="px-4 pb-3 text-xs text-gray-500">{invalidCount} task(s) omitted because their schedule dates are incomplete or invalid.</p>}
        <div className="px-4 pb-5 pt-1">
          <button
            className="flex items-center rounded bg-blue-primary px-3 py-2 text-white hover:bg-blue-600"
            onClick={() => setIsModalNewTaskOpen(true)}
          >
            Add New Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default Timeline;

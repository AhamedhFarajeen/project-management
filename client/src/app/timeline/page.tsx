"use client";

import Header from "@/components/Header";
import { useGetProjectsQuery } from "@/state/api";
import { Gantt } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { projectTimelineRecord } from "@/lib/timeline";
import React, { useMemo } from "react";

const Timeline = () => {
  const { data: projects, isLoading, isError } = useGetProjectsQuery();

  const ganttTasks = useMemo(() => {
    return projects?.flatMap((project) => { const item = projectTimelineRecord(project); return item ? [item] : []; }) || [];
  }, [projects]);

  if (isLoading) return <div>Loading...</div>;
  if (isError || !projects)
    return <div>An error occurred while fetching projects</div>;

  const invalidCount = projects.length - ganttTasks.length;

  return (
    <div className="max-w-full p-8">
      <header className="mb-4 flex items-center justify-between">
        <Header name="Projects Timeline" />
      </header>

      <div className="overflow-hidden rounded-md bg-white shadow dark:bg-dark-secondary dark:text-white">
        {ganttTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-neutral-400">No projects with valid start and end dates to display.</div>
        ) : (
        <div className="timeline">
          <Gantt tasks={ganttTasks} readonly cellBorders="full" />
        </div>
        )}
        {invalidCount > 0 && ganttTasks.length > 0 && <p className="px-4 pb-3 text-xs text-gray-500">{invalidCount} project(s) omitted because their schedule dates are incomplete or invalid.</p>}
      </div>
    </div>
  );
};

export default Timeline;

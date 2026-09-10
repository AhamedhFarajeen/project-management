import { Task } from "@/state/api";
import Image from "next/image";
import React from "react";
import { formatDisplayDate } from "@/lib/utils";

type Props = {
  task: Task;
  onOpen?: (task: Task) => void;
};

const TaskCard = ({ task, onOpen }: Props) => {
  const assignedThroughJoin = task.taskAssignments?.map(({ user }) => user) ?? [];
  const assignees = assignedThroughJoin.length
    ? assignedThroughJoin
    : task.assignee
      ? [task.assignee]
      : [];

  return (
    <div onClick={() => onOpen?.(task)} className={`mb-3 rounded bg-white p-4 shadow dark:bg-dark-secondary dark:text-white ${onOpen ? "cursor-pointer" : ""}`}>
      {task.attachments && task.attachments.length > 0 && (
        <div>
          <strong>Attachments:</strong>
          <div className="flex flex-wrap">
            {task.attachments && task.attachments.length > 0 && (
              <Image
                src={`/${task.attachments[0].fileURL}`}
                alt={task.attachments[0].fileName}
                width={400}
                height={200}
                className="rounded-md"
              />
            )}
          </div>
        </div>
      )}
      <p>
        <strong>ID:</strong> {task.id}
      </p>
      <p>
        <strong>Title:</strong> {task.title}
      </p>
      <p>
        <strong>Description:</strong>{" "}
        {task.description || "No description provided"}
      </p>
      <p>
        <strong>Status:</strong> {task.status}
      </p>
      <p>
        <strong>Priority:</strong> {task.priority}
      </p>
      <p>
        <strong>Tags:</strong> {task.tags || "No tags"}
      </p>
      <p>
        <strong>Start Date:</strong>{" "}
        {formatDisplayDate(task.startDate)}
      </p>
      <p>
        <strong>Due Date:</strong>{" "}
        {formatDisplayDate(task.dueDate)}
      </p>
      <p>
        <strong>Author:</strong>{" "}
        {task.author ? task.author.username : "Unknown"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <strong>Assignees:</strong>
        {assignees.length
          ? assignees.map((user) => (
              <span key={user.userId} className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-dark-tertiary">
                {user.username}
              </span>
            ))
          : "Unassigned"}
      </div>
    </div>
  );
};

export default TaskCard;

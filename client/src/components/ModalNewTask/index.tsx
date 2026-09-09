import Modal from "@/components/Modal";
import {
  Priority,
  Status,
  useCreateTaskMutation,
  useGetUsersQuery,
} from "@/state/api";
import React, { useState } from "react";
import { formatISO } from "date-fns";
import { Check, Search, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  id?: string | null;
};

const ModalNewTask = ({ isOpen, onClose, id = null }: Props) => {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(Status.ToDo);
  const [priority, setPriority] = useState<Priority>(Priority.Backlog);
  const [tags, setTags] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const { data: users = [], isLoading: areUsersLoading } = useGetUsersQuery();

  const normalizedSearch = assigneeSearch.trim().toLowerCase();
  const matchingUsers = users.filter((user) => {
    if (user.userId === undefined || assignedUserIds.includes(user.userId)) return false;
    if (!normalizedSearch) return true;
    return [user.username, user.email, String(user.userId)]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const selectedUsers = assignedUserIds
    .map((userId) => users.find((user) => user.userId === userId))
    .filter((user): user is NonNullable<typeof user> => user !== undefined);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus(Status.ToDo);
    setPriority(Priority.Backlog);
    setTags("");
    setStartDate("");
    setDueDate("");
    setAssignedUserIds([]);
    setAssigneeSearch("");
    setProjectId("");
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const formattedStartDate = formatISO(new Date(startDate), {
      representation: "complete",
    });
    const formattedDueDate = formatISO(new Date(dueDate), {
      representation: "complete",
    });

    await createTask({
      title,
      description,
      status,
      priority,
      tags,
      startDate: formattedStartDate,
      dueDate: formattedDueDate,
      assignedUserIds,
      projectId: id !== null ? Number(id) : Number(projectId),
    }).unwrap();
    resetForm();
    onClose();
  };

  const isFormValid = () => {
    return title && startDate && dueDate && Number(id ?? projectId) > 0;
  };

  const selectStyles =
    "mb-4 block w-full rounded border border-gray-300 px-3 py-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Task">
      <form
        className="mt-4 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className={inputStyles}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
          <select
            className={selectStyles}
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as Status)
            }
          >
            <option value="">Select Status</option>
            <option value={Status.ToDo}>To Do</option>
            <option value={Status.WorkInProgress}>Work In Progress</option>
            <option value={Status.UnderReview}>Under Review</option>
            <option value={Status.Completed}>Completed</option>
          </select>
          <select
            className={selectStyles}
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as Priority)
            }
          >
            <option value="">Select Priority</option>
            <option value={Priority.Urgent}>Urgent</option>
            <option value={Priority.High}>High</option>
            <option value={Priority.Medium}>Medium</option>
            <option value={Priority.Low}>Low</option>
            <option value={Priority.Backlog}>Backlog</option>
          </select>
        </div>
        <input
          type="text"
          className={inputStyles}
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
          <input
            type="date"
            className={inputStyles}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className={inputStyles}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Assignees
          </label>
          {selectedUsers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user.userId}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-sm text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                >
                  {user.username}
                  <button
                    type="button"
                    aria-label={`Remove ${user.username}`}
                    onClick={() => setAssignedUserIds((ids) => ids.filter((userId) => userId !== user.userId))}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              className={`${inputStyles} pl-9`}
              placeholder="Search by name, email, or user ID"
              value={assigneeSearch}
              onFocus={() => setIsAssigneePickerOpen(true)}
              onChange={(event) => {
                setAssigneeSearch(event.target.value);
                setIsAssigneePickerOpen(true);
              }}
              autoComplete="off"
            />
            {isAssigneePickerOpen && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
                {areUsersLoading ? (
                  <p className="px-3 py-2 text-sm text-gray-500">Loading users...</p>
                ) : matchingUsers.length ? (
                  matchingUsers.map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-gray-100 dark:text-white dark:hover:bg-dark-tertiary"
                      onClick={() => {
                        if (user.userId !== undefined) {
                          setAssignedUserIds((ids) => [...ids, user.userId!]);
                          setAssigneeSearch("");
                        }
                      }}
                    >
                      <span>
                        <span className="block text-sm font-medium">{user.username}</span>
                        <span className="block text-xs text-gray-500">{user.email || `User ID ${user.userId}`}</span>
                      </span>
                      <Check size={15} className="text-blue-500 opacity-0" aria-hidden="true" />
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-500">No matching users</p>
                )}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>Select one or more people</span>
            {isAssigneePickerOpen && (
              <button type="button" onClick={() => setIsAssigneePickerOpen(false)} className="font-medium text-blue-500">
                Done
              </button>
            )}
          </div>
        </div>
        {id === null && (
          <input
            type="text"
            className={inputStyles}
            placeholder="ProjectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        )}
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewTask;

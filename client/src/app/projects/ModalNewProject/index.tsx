import Modal from "@/components/Modal";
import { Project, useCreateProjectMutation, useUpdateProjectMutation } from "@/state/api";
import React, { useState } from "react";
import { formatISO } from "date-fns";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
};

const ModalNewProject = ({ isOpen, onClose, project }: Props) => {
  const [createProject, { isLoading }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [startDate, setStartDate] = useState(project?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(project?.endDate?.slice(0, 10) ?? "");
  const [error, setError] = useState<string | null>(null);
  const busy = isLoading || isUpdating;

  const handleSubmit = async () => {
    if (!projectName || !startDate || !endDate) return;

    const formattedStartDate = formatISO(new Date(startDate), {
      representation: "complete",
    });
    const formattedEndDate = formatISO(new Date(endDate), {
      representation: "complete",
    });

    setError(null);
    try {
      if (project) await updateProject({ id: project.id, data: { name: projectName, description, startDate: formattedStartDate, endDate: formattedEndDate } }).unwrap();
      else await createProject({ name: projectName, description, startDate: formattedStartDate, endDate: formattedEndDate }).unwrap();
      setProjectName(""); setDescription(""); setStartDate(""); setEndDate("");
      onClose();
    } catch (error: unknown) {
      const message = typeof error === "object" && error && "data" in error && typeof error.data === "object" && error.data && "message" in error.data && typeof error.data.message === "string" ? error.data.message : null;
      setError(message ?? (project ? "Unable to save project. Please try again." : "Unable to create project. Please try again."));
    }
  };

  const isFormValid = () => {
    return projectName && description && startDate && endDate;
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Project">
      <form
        className="mt-4 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <input
          type="text"
          className={inputStyles}
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            !isFormValid() || busy ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || busy}
        >
          {busy ? (project ? "Saving..." : "Creating...") : (project ? "Save Changes" : "Create Project")}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewProject;

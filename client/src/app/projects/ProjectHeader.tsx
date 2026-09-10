import Header from "@/components/Header";
import {
  Clock,
  Grid3x3,
  List, 
  PlusSquare,
  Table,
} from "lucide-react";
import { useDeleteProjectMutation, useGetCurrentUserQuery, useGetProjectQuery } from "@/state/api";
import { managesProject } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import ModalNewProject from "../projects/ModalNewProject"


type Props = {
  id: string;
  activeTab : string;
  setActiveTab : (tabName:string) => void
}

const ProjectHeader = ({ id, activeTab, setActiveTab }: Props) => {
  const [isModalNewProjectOpen, setIsModalNewProjectOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: project } = useGetProjectQuery(Number(id));
  const { data: currentUser, isLoading: isUserLoading } = useGetCurrentUserQuery();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const router = useRouter();

  const canManage = !isUserLoading && managesProject(currentUser, project);
  return (
    <div className="px-4 xl:px-6">
     
      <div className="pb-6 pt-6 lg:pb-4 lg:pt-8">
        <ModalNewProject key={project?.id ?? "new"} project={project} isOpen = {isModalNewProjectOpen} onClose ={()=> setIsModalNewProjectOpen(false)}/>
        <Header
          name={project?.name ?? "Project"}
          buttonComponent={
            canManage ? (
            <button
              className="flex items-center rounded-md bg-blue-primary px-3 py-2 text-white hover:bg-blue-600"
              onClick={() => setIsModalNewProjectOpen(true)}
            >
              <PlusSquare className="mr-2 h-5 w-5" /> Edit Project
            </button>
            ) : undefined
          }
        />
      </div>

      <div className="mb-4 flex justify-end">
        {deleteError && <p role="alert" className="mr-4 text-sm text-red-600">{deleteError}</p>}
        {canManage && (!confirmDelete ? <button type="button" onClick={() => { setDeleteError(null); setConfirmDelete(true); }} className="text-sm text-red-600 hover:text-red-700">Delete project</button> : <div className="flex items-center gap-3 text-sm"><span>Delete this project?</span><button type="button" disabled={isDeleting} onClick={async () => { try { await deleteProject(Number(id)).unwrap(); router.push('/home'); } catch { setDeleteError("Unable to delete project. Please try again."); } }} className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50">{isDeleting ? "Deleting..." : "Confirm"}</button><button type="button" disabled={isDeleting} onClick={() => setConfirmDelete(false)}>Cancel</button></div>)}
      </div>

      {/* TABS */}
      <div className="flex flex-wrap-reverse gap-2 border-y border-gray-200 pb-[8px] pt-2 dark:border-stroke-dark md:items-center">
        <div className="flex flex-1 items-center gap-2 md:gap-4">
          <TabButton
            name="Board"
            icon={<Grid3x3 className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="List"
            icon={<List className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="Timeline"
            icon={<Clock className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="Table"
            icon={<Table className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>
    </div>
  );
};

type TabButtonProps = {
  name: string;
  icon: React.ReactNode;
  setActiveTab: (tabName: string) => void;
  activeTab: string;
};

const TabButton = ({ name, icon, setActiveTab, activeTab }: TabButtonProps) => {
  const isActive = activeTab === name;

  return (
    <button
      className={`relative flex items-center gap-2 px-1 py-2 text-gray-500 after:absolute after:-bottom-[9px] after:left-0 after:h-[1px] after:w-full hover:text-blue-600 dark:text-neutral-500 dark:hover:text-white sm:px-2 lg:px-4 ${
        isActive ? "text-blue-600 after:bg-blue-600 dark:text-white" : ""
      }`}
      onClick={() => setActiveTab(name)}
    >
      {icon}
      {name}
    </button>
  );
};

export default ProjectHeader

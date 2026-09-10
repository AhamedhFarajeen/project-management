"use client";

import React, { useState } from "react";
import ProjectHeader from "@/app/projects/ProjectHeader";
import Board from "../BoardView";
import List from "../ListView";
import ModalNewTask from "@/components/ModalNewTask";
import { useGetProjectQuery } from "@/state/api";
import { useGetCurrentUserQuery } from "@/state/api";
import ProjectMembers from "../ProjectMembers";

import Timeline from "../TimelineView"
import Table from "../TableView";

type Props = {
  params: Promise<{ id: string }>;
};

const Project = ({ params }: Props) => {
  const { id } = React.use(params);
  const [activeTab, setActiveTab] = useState("Board");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const { data: project, isLoading, isError, error } = useGetProjectQuery(Number(id), { skip: !Number.isInteger(Number(id)) || Number(id) <= 0 });
  const { data: currentUser, isLoading: isCurrentUserLoading } = useGetCurrentUserQuery();

  if (!Number.isInteger(Number(id)) || Number(id) <= 0 || (error as { status?: number } | undefined)?.status === 404) {
    return <div className="p-8 text-center">Project not found.</div>;
  }
  if (isLoading) return <div className="p-8">Loading project...</div>;
  if (isError || !project) return <div className="p-8 text-center">{(error as { status?: number } | undefined)?.status === 403 ? "You do not have access to this project." : "Unable to load this project."}</div>;
  if (isCurrentUserLoading) return <div className="p-8">Loading your permissions...</div>;

  return (
    <div>
      <ModalNewTask
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        id={id}
      />
      <ProjectHeader
        id={id}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <ProjectMembers project={project} currentUser={currentUser} />

      {activeTab === "Board" && (
        <Board id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen}/>
      )}

      {activeTab === "List" && (
        <List id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen}/>
      )}
      {activeTab === "Timeline" && (
        <Timeline id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen}/>
      )}
      {activeTab === "Table" && (
        <Table id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen}/>
      )}
    </div>
  );
};

export default Project;

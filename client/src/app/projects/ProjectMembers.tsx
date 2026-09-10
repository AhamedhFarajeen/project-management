"use client";

import Modal from "@/components/Modal";
import { Project, User, useAddProjectMemberMutation, useGetProjectMemberCandidatesQuery, useGetProjectMembersQuery, useRemoveProjectMemberMutation } from "@/state/api";
import { managesProject } from "@/lib/permissions";
import { useState } from "react";

export default function ProjectMembers({ project, currentUser }: { project: Project; currentUser?: User }) {
  const canManage = managesProject(currentUser, project);
  const { data: members = [], isLoading } = useGetProjectMembersQuery(project.id);
  const { data: candidates = [] } = useGetProjectMemberCandidatesQuery(project.id, { skip: !canManage });
  const [addMember] = useAddProjectMemberMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = async () => { if (!selected) return; setError(null); try { await addMember({ projectId: project.id, userId: Number(selected) }).unwrap(); setSelected(""); } catch (err: unknown) { const message = typeof err === "object" && err && "data" in err && typeof err.data === "object" && err.data && "message" in err.data ? err.data.message : undefined; setError(message === "User is already a project member." ? "This user is already a project member." : "Unable to add this member."); } };
  const remove = async (member: User) => { if (member.userId === project.projectManagerUserId) { setError("Reassign the project manager before removing them."); return; } setError(null); try { await removeMember({ projectId: project.id, userId: member.userId! }).unwrap(); } catch { setError("Unable to remove this member."); } };
  return <section className="mt-6 rounded-lg bg-white p-5 shadow dark:bg-dark-secondary dark:text-white">
    <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Project members</h2><p className="text-sm text-gray-500">{isLoading ? "Loading..." : `${members.length} member${members.length === 1 ? "" : "s"}`}</p></div>{canManage && <button type="button" onClick={() => setOpen(true)} className="rounded bg-blue-primary px-3 py-2 text-sm text-white">Manage members</button>}</div>
    {project.projectManager && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">Project Manager:</span> {project.projectManager.username}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{members.map((member) => <span key={member.userId} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm dark:bg-dark-tertiary">{member.username}{member.userId === project.projectManagerUserId ? " · Project Manager" : ""}</span>)}</div>
    {canManage && <Modal isOpen={open} onClose={() => setOpen(false)} name="Manage Project Members"><div className="space-y-4"><label className="block text-sm font-medium">Add member<select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-1 block w-full rounded border p-2 dark:border-dark-tertiary dark:bg-dark-tertiary"><option value="">Select a user</option>{candidates.map((user) => <option key={user.userId} value={user.userId}>{user.username} ({user.role})</option>)}</select></label><button type="button" disabled={!selected} onClick={add} className="rounded bg-blue-primary px-3 py-2 text-sm text-white disabled:opacity-50">Add member</button>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="divide-y dark:divide-gray-700">{members.map((member) => <div key={member.userId} className="flex items-center justify-between py-2"><span>{member.username}{member.userId === project.projectManagerUserId ? " · Project Manager" : ""}</span><button type="button" disabled={member.userId === project.projectManagerUserId} onClick={() => remove(member)} className="text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Remove</button></div>)}</div></div></Modal>}
  </section>;
}

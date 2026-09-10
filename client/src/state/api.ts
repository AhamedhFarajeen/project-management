import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "@/lib/apiConfig";

export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  taskCount?: number;
  teams?: { id: number; teamName: string }[];
  projectManagerUserId?: number | null;
  projectManager?: User | null;
  members?: { userId: number }[];
}

export enum Priority {
  Urgent = "Urgent",
  High = "High",
  Medium = "Medium",
  Low = "Low",
  Backlog = "Backlog",
}

export enum Status {
  ToDo = "To Do",
  WorkInProgress = "Work In Progress",
  UnderReview = "Under Review",
  Completed = "Completed",
}

export interface User {
  userId?: number;
  username: string;
  role?: "ADMIN" | "PROJECT_MANAGER" | "MEMBER";
  email?: string | null;
  clerkUserId?: string | null;
  team?: { id: number; teamName: string } | null;
  profilePictureUrl?: string;
  teamId?: number;
}

export interface Attachment {
  id: number;
  fileURL: string;
  fileName: string;
  taskId: number;
  uploadedById: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  tags?: string;
  startDate?: string;
  dueDate?: string;
  points?: number;
  projectId: number;
  authorUserId?: number;
  assignedUserId?: number;

  author?: User;
  assignee?: User;
  taskAssignments?: TaskAssignment[];
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface TaskAssignment {
  id: number;
  userId: number;
  taskId: number;
  user: User;
}

export type CreateTaskInput = Partial<Task> & {
  assignedUserIds?: number[];
};

export interface SearchResults {
  tasks?: Task[];
  projects?: Project[];
  users?: User[];
  teams?: { id: number; teamName: string }[];
}

export interface Team {
  id: number;
  teamName: string;
  productOwnerUserId?: number;
  projectManagerUserId?: number;
}


export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers, { extra }) => {
      const { getToken } = extra as { getToken: () => Promise<string | null> };
      const token = await getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  reducerPath: "api",

  tagTypes: ["Projects", "Tasks", "Users", "Teams"],

  endpoints: (build) => ({
    getProjects: build.query<Project[], void>({
      query: () => "projects",
      providesTags: ["Projects"],
    }),

    getProject: build.query<Project, number>({
      query: (id) => `projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Projects", id }],
    }),

    updateProject: build.mutation<Project, { id: number; data: Partial<Pick<Project, "name" | "description" | "startDate" | "endDate">> }>({
      query: ({ id, data }) => ({ url: `projects/${id}`, method: "PATCH", body: data }),
      invalidatesTags: (_result, _error, { id }) => ["Projects", { type: "Projects", id }],
    }),

    deleteProject: build.mutation<void, number>({
      query: (id) => ({ url: `projects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Projects"],
    }),

    getProjectMembers: build.query<User[], number>({
      query: (id) => `projects/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: "Projects", id }, "Users"],
    }),
    getProjectMemberCandidates: build.query<User[], number>({
      query: (id) => `projects/${id}/member-candidates`,
      providesTags: (_result, _error, id) => [{ type: "Projects", id }, "Users"],
    }),
    addProjectMember: build.mutation<User, { projectId: number; userId: number }>({
      query: ({ projectId, userId }) => ({ url: `projects/${projectId}/members`, method: "POST", body: { userId } }),
      invalidatesTags: (_result, _error, { projectId }) => ["Projects", "Users", { type: "Projects", id: projectId }],
    }),
    removeProjectMember: build.mutation<void, { projectId: number; userId: number }>({
      query: ({ projectId, userId }) => ({ url: `projects/${projectId}/members/${userId}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { projectId }) => ["Projects", "Users", { type: "Projects", id: projectId }],
    }),
    updateUserTeam: build.mutation<User, { userId: number; teamId: number | null }>({
      query: ({ userId, teamId }) => ({ url: `users/${userId}/team`, method: "PATCH", body: { teamId } }),
      invalidatesTags: ["Users", "Teams", "Projects"],
    }),

    createProject: build.mutation<Project, Partial<Project>>({
      query: (project) => ({
        url: "projects",
        method: "POST",
        body: project,
      }),
      invalidatesTags: ["Projects"],
    }),

    getTasks: build.query<Task[], { projectId: number }>({
      query: ({ projectId }) => `tasks?projectId=${projectId}`,
      providesTags: (result) =>
        result
          ? result.map(({ id }) => ({
              type: "Tasks" as const,
              id,
            }))
          : [{ type: "Tasks" as const }],
    }),

    getTask: build.query<Task, number>({
      query: (id) => `tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Tasks", id }],
    }),

    updateTask: build.mutation<Task, { id: number; data: Partial<CreateTaskInput> }>({
      query: ({ id, data }) => ({ url: `tasks/${id}`, method: "PATCH", body: data }),
      invalidatesTags: (_result, _error, { id }) => ["Tasks", { type: "Tasks", id }],
    }),

    deleteTask: build.mutation<void, number>({
      query: (id) => ({ url: `tasks/${id}`, method: "DELETE" }),
      invalidatesTags: ["Tasks"],
    }),

    getTasksByUser: build.query<Task[], number>({
      query: (userId) => `tasks/user/${userId}`,
      providesTags: (result, error, userId) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks", id }))
          : [{ type: "Tasks", id: userId }],
    }),
    getMyTasks: build.query<Task[], void>({
      query: () => "tasks/me",
      providesTags: ["Tasks"],
    }),

    createTask: build.mutation<Task, CreateTaskInput>({
      query: (task) => ({
        url: "tasks",
        method: "POST",
        body: task,
      }),
      invalidatesTags: ["Tasks"],
    }),

    updateTaskStatus: build.mutation<Task, { taskId: number; status: string }>({
      query: ({ taskId, status }) => ({
        url: `tasks/${taskId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),

    getCurrentUser: build.query<User, void>({
      query: () => "users/me",
      providesTags: ["Users"],
    }),

    getUsers: build.query<User[], void>({
      query: () => "users",
      providesTags: ["Users"],
    }),

    getTeams: build.query<Team[], void>({
      query: () => "teams",
      providesTags: ["Teams"],
    }),

    search: build.query<SearchResults, string>({
      query: (query) => ({ url: "search", params: { query } }),
    }),

  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectMembersQuery,
  useGetProjectMemberCandidatesQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useUpdateUserTeamMutation,
  useCreateProjectMutation,
  useGetTasksQuery,
  useGetTaskQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useSearchQuery,
  useGetCurrentUserQuery,
  useGetUsersQuery,
  useGetTeamsQuery,
  useGetTasksByUserQuery
  ,useGetMyTasksQuery
} = api;

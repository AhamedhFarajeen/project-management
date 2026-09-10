"use client";
import { profileImage } from "@/lib/profileImage";
import { useGetCurrentUserQuery, useGetTeamsQuery, useGetUsersQuery, useUpdateUserTeamMutation } from "@/state/api";
import React from "react";
import { useAppSelector } from "../redux";
import Header from "@/components/Header";
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import Image from "next/image";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";

const CustomToolbar = () => (
  <GridToolbarContainer className="toolbar flex gap-2">
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const columns: GridColDef[] = [
  { field: "userId", headerName: "ID", width: 100 },
  { field: "username", headerName: "Username", width: 150 },
  { field: "role", headerName: "Role", width: 170 },
  { field: "team", headerName: "Team", width: 220, valueGetter: (_value, row) => row.team?.teamName ?? "No team" },
  {
    field: "profilePictureUrl",
    headerName: "Profile Picture",
    width: 100,
    renderCell: (params) => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-9 w-9">
          <Image
            src={profileImage(params.value)}
            alt={params.row.username}
            width={100}
            height={50}
            className="h-full rounded-full object-cover"
          />
        </div>
      </div>
    ),
  },
];

const Users = () => {
  const { data: users, isLoading, isError } = useGetUsersQuery();
  const { data: currentUser, isLoading: isCurrentUserLoading } = useGetCurrentUserQuery();
  const { data: teams = [] } = useGetTeamsQuery(undefined, { skip: currentUser?.role !== "ADMIN" });
  const [updateUserTeam] = useUpdateUserTeamMutation();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  if (isCurrentUserLoading || isLoading) return <div>Loading...</div>;
  if (currentUser?.role !== "ADMIN") return <div className="p-8">You do not have access to the Users page.</div>;
  if (isError || !users) return <div>Error fetching users</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Users" />
      <div className="mb-4 text-sm text-gray-500">Assign a team before adding a user to a project. Team membership alone does not grant project access.</div>
      <div style={{ height: 650, width: "100%" }}>
        <DataGrid
          rows={users || []}
          columns={[...columns, { field: "teamAssignment", headerName: "Assign Team", width: 220, sortable: false, renderCell: (params) => <select aria-label={`Assign team to ${params.row.username}`} value={params.row.teamId ?? ""} onChange={(event) => updateUserTeam({ userId: params.row.userId, teamId: event.target.value ? Number(event.target.value) : null })} className="rounded border p-1"><option value="">No team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.teamName}</option>)}</select> } as GridColDef]}
          getRowId={(row) => row.userId}
          pagination
          showToolbar
          slots={{
            toolbar: CustomToolbar,
          }}
          className={dataGridClassNames}
          sx={dataGridSxStyles(isDarkMode)}
        />
      </div>
    </div>
  );
};

export default Users;

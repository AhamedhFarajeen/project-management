"use client";
import Header from "@/components/Header";
import { useGetCurrentUserQuery } from "@/state/api";
import { UserProfile } from "@clerk/nextjs";

export default function Settings() {
  const { data: user } = useGetCurrentUserQuery();
  return (
    <div className="p-8">
      <Header name="Settings" />
      <p className="mb-4">Team: {user?.team?.teamName ?? "No team assigned"}</p>
      <UserProfile routing="hash" />
    </div>
  );
}

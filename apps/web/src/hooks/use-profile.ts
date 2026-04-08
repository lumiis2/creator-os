import { useMutation, useQuery } from "@tanstack/react-query";

export interface Profile {
  displayName: string | null;
  niche: string | null;
  subNiche: string | null;
  contentStyle: string[] | null;
  audienceDesc: string | null;
  postingGoalFreq: number | null;
  agentMode: string;
  timezone: string | null;
}

export interface Connection {
  id: string;
  platform: string;
  displayName: string | null;
  status: string;
  lastSyncedAt: string | null;
}

async function fetchProfile(): Promise<{ data: Profile | null }> {
  const res = await fetch("/api/profile", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

async function updateProfile(payload: Partial<Profile>) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

async function fetchConnections(): Promise<{ data: Connection[] }> {
  const res = await fetch("/api/profile/connections", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load connections");
  return res.json();
}

export function useProfile() {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const connectionsQuery = useQuery({
    queryKey: ["profile-connections"],
    queryFn: fetchConnections,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
  });

  return {
    profileQuery,
    connectionsQuery,
    updateMutation,
  };
}

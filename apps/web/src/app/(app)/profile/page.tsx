"use client";

import { useEffect, useState } from "react";
import { ConnectedAccounts } from "@/components/profile/connected-accounts";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";
import { useProfile } from "@/hooks/use-profile";
import type { Profile } from "@/hooks/use-profile";

export default function ProfilePage() {
  const { profileQuery, connectionsQuery, updateMutation } = useProfile();

  const [form, setForm] = useState<Profile>({
    displayName: "",
    niche: "",
    subNiche: "",
    contentStyle: [],
    audienceDesc: "",
    postingGoalFreq: 3,
    agentMode: "proactive",
    timezone: "UTC",
  });

  useEffect(() => {
    if (profileQuery.data?.data) {
      setForm({
        displayName: profileQuery.data.data.displayName ?? "",
        niche: profileQuery.data.data.niche ?? "",
        subNiche: profileQuery.data.data.subNiche ?? "",
        contentStyle: profileQuery.data.data.contentStyle ?? [],
        audienceDesc: profileQuery.data.data.audienceDesc ?? "",
        postingGoalFreq: profileQuery.data.data.postingGoalFreq ?? 3,
        agentMode: profileQuery.data.data.agentMode ?? "proactive",
        timezone: profileQuery.data.data.timezone ?? "UTC",
      });
    }
  }, [profileQuery.data]);

  function setField(key: keyof Profile, value: Profile[keyof Profile]) {
    setForm((prev: Profile) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {profileQuery.isLoading ? (
        <ProfileSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <ProfileForm
            value={form}
            onChange={(key, value) => setField(key as keyof Profile, value as Profile[keyof Profile])}
            onSave={() => updateMutation.mutate(form)}
            saving={updateMutation.isPending}
          />
          <div className="space-y-2">
            {connectionsQuery.error && <div className="text-xs text-red-400">Failed to load connections.</div>}
            <ConnectedAccounts connections={connectionsQuery.data?.data ?? []} />
          </div>
        </div>
      )}
    </div>
  );
}

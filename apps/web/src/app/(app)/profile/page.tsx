"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConnectedAccounts } from "@/components/profile/connected-accounts";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";
import { useProfile } from "@/hooks/use-profile";
import type { Profile } from "@/hooks/use-profile";

function ProfilePageContent() {
  const { profileQuery, connectionsQuery, updateMutation } = useProfile();
  const searchParams = useSearchParams();

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

  const metaStatus = searchParams.get("meta");
  const metaReason = searchParams.get("reason");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {metaStatus === "connected" && (
        <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs text-green-300">
          Facebook and Instagram connected successfully.
        </div>
      )}
      {metaStatus === "facebook_only" && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Facebook connected, but no Instagram Business/Creator account was found linked to your page.
        </div>
      )}
      {metaStatus === "error" && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Meta connection failed{metaReason ? `: ${metaReason}` : "."}
        </div>
      )}
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="space-y-6"><h1 className="text-2xl font-semibold">Profile</h1><ProfileSkeleton /></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

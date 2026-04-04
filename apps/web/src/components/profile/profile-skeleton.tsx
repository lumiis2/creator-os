export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 animate-pulse rounded bg-card" />
      <div className="h-64 animate-pulse rounded-lg bg-card" />
      <div className="h-24 animate-pulse rounded-lg bg-card" />
    </div>
  );
}

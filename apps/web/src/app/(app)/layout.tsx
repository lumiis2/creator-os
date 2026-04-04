import Link from "next/link";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-white">
      <aside className="w-56 border-r border-border p-6">
        <h2 className="mb-6 text-lg font-bold">CreatorOS</h2>
        <nav className="grid gap-2 text-sm">
          <Link className="rounded-md px-2 py-1 hover:bg-card" href="/dashboard">Dashboard</Link>
          <Link className="rounded-md px-2 py-1 hover:bg-card" href="/chat">Chat</Link>
          <Link className="rounded-md px-2 py-1 hover:bg-card" href="/workspace">Workspace</Link>
          <Link className="rounded-md px-2 py-1 hover:bg-card" href="/profile">Profile</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

import "@/app/globals.css";
import type { ReactNode } from "react";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata = {
  title: "CreatorOS",
  description: "CreatorOS MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-white" suppressHydrationWarning>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

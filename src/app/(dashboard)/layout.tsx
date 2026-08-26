import { RailNav } from "@/components/dashboard/rail-nav";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <RailNav />
      <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-y-auto px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}

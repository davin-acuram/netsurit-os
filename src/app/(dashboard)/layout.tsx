import { RailNav } from "@/components/dashboard/rail-nav";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <RailNav />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}

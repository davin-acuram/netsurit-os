import { MainScrollArea } from "@/components/dashboard/main-scroll-area";
import { RailNav } from "@/components/dashboard/rail-nav";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <RailNav />
      <MainScrollArea>
        <div className="mx-auto w-full max-w-[1600px] px-6 py-8 lg:px-10">{children}</div>
      </MainScrollArea>
    </div>
  );
}

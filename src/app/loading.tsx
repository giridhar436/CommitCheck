import { DashboardSkeleton } from "@/components/ui/loading-skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-20 border-b border-[#dddddd] bg-white animate-pulse" />
      <DashboardSkeleton title="Loading CommitCheck..." />
    </div>
  );
}

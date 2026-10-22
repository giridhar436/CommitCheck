import React from "react";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-[#ebebeb] ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-4 border-t border-[#f7f7f7] flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24 rounded-[8px]" />
      </div>
    </div>
  );
}

export function DashboardSkeleton({ title = "Loading dashboard..." }: { title?: string }) {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10 w-full animate-pulse" aria-busy="true" aria-label={title}>
      {/* Header Skeleton */}
      <div className="pb-8 mb-8 border-b border-[#dddddd] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-4 w-32 mb-2 rounded-full" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[8px]" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Main Content Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

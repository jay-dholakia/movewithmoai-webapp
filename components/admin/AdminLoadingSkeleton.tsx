import { cn } from "@/lib/utils";

export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200/75", className)}
      aria-hidden
    />
  );
}

export function AdminPageTitleSkeleton() {
  return (
    <div className="flex justify-between gap-4 mb-8">
      <div className="space-y-2 flex-1 min-w-0">
        <Shimmer className="h-8 w-56 max-w-full" />
        <Shimmer className="h-3 w-40 max-w-full" />
      </div>
      <Shimmer className="h-9 w-28 shrink-0" />
    </div>
  );
}

export function AdminCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <Shimmer className="h-4 w-28" />
      <div className="grid gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Shimmer key={i} className="h-10 w-full" />
        ))}
      </div>
    </section>
  );
}

export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="border border-gray-200 rounded-lg divide-y bg-white overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="px-4 py-3 flex justify-between gap-4 items-center">
          <div className="space-y-2 flex-1 min-w-0">
            <Shimmer className="h-4 w-48 max-w-full" />
            <Shimmer className="h-3 w-20" />
          </div>
          <Shimmer className="h-4 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function AdminTemplateEditorSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <Shimmer className="h-8 w-48" />
        <Shimmer className="h-9 w-32" />
      </div>
      <AdminCardSkeleton lines={6} />
      <section className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-2 py-2 flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer key={i} className="h-4 flex-1 min-w-[3rem]" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-t px-2 py-2 flex gap-2 items-center">
            <Shimmer className="h-8 w-8 shrink-0" />
            <Shimmer className="h-8 w-12" />
            <Shimmer className="h-4 flex-1" />
            <Shimmer className="h-8 w-10" />
            <Shimmer className="h-8 w-10" />
          </div>
        ))}
      </section>
    </div>
  );
}

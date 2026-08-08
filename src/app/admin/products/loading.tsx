export default function AdminProductsLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 h-7 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-zinc-200" />
      </div>

      <div className="mb-4 flex items-end gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-40 animate-pulse rounded bg-zinc-200" />
        ))}
        <div className="h-9 w-16 animate-pulse rounded bg-zinc-200" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl bg-white p-4">
            <div className="h-10 w-10 rounded bg-zinc-200" />
            <div className="h-4 flex-1 rounded bg-zinc-200" />
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="h-4 w-16 rounded bg-zinc-200" />
            <div className="h-6 w-16 rounded-full bg-zinc-200" />
            <div className="h-6 w-24 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

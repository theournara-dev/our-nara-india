export default function AdminPagesLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 h-7 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-zinc-200" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 rounded-xl bg-white p-4"
          >
            <div className="h-4 w-32 rounded bg-zinc-200" />
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="h-4 w-12 rounded bg-zinc-200" />
            <div className="ml-auto h-6 w-16 rounded-full bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

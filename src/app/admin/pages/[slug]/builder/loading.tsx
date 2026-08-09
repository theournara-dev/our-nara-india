export default function PageBuilderLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 h-7 w-44 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-zinc-200" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 rounded-xl bg-white p-4"
          >
            <div className="h-5 w-5 rounded bg-zinc-200" />
            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-zinc-200" />
              <div className="mt-2 h-3 w-24 rounded bg-zinc-200" />
            </div>
            <div className="h-5 w-5 rounded bg-zinc-200" />
            <div className="h-5 w-5 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

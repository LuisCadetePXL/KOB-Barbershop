export default function PlaceholderPage({
  title,
  phase,
  devOnly = false,
}: {
  title: string
  phase: number
  devOnly?: boolean
}) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-kob-white">{title}</h1>
        {devOnly && (
          <span className="rounded-full border border-kob-red px-2 py-0.5 text-xs uppercase tracking-widest text-kob-red">
            Developer only
          </span>
        )}
      </div>

      <div className="mt-8 border border-dashed border-kob-border bg-kob-dark rounded p-10 text-center">
        <p className="text-3xl text-kob-border">🚧</p>
        <p className="mt-3 text-sm font-semibold text-kob-muted">
          Coming in phase {phase}
        </p>
        <p className="mt-1 text-xs text-kob-border">
          This section is scaffolded and will be built in the next development phase.
        </p>
      </div>
    </div>
  )
}

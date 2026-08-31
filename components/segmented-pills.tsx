'use client'

// Reusable top-of-view segmented control. Renders equal-width pills; the
// active pill gets a subtle emerald highlight to match the nav accent.
export function SegmentedPills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  ariaLabel?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1"
    >
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-emerald-500/15 text-emerald-400 shadow-sm ring-1 ring-emerald-500/30'
                : 'text-muted-foreground'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

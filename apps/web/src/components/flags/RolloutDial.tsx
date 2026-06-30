interface Props {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}

function rolloutLabel(v: number): string {
  if (v === 0) return 'Off for everyone'
  if (v === 100) return 'Enabled for everyone'
  return `Enabled for ${v}% of users (hash-based, consistent per user)`
}

export function RolloutDial({ value, onChange, disabled = false }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Rollout percentage</label>
        <span className="text-lg font-semibold text-brand-600">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <p className="text-xs text-gray-500">{rolloutLabel(value)}</p>
    </div>
  )
}

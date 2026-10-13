import { clsx } from 'clsx'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, disabled = false, size = 'md' }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
        size === 'md' ? 'h-6 w-11' : 'h-4 w-7',
        checked ? 'bg-brand-500' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'inline-block rounded-full bg-white shadow-sm transition-transform',
          size === 'md' ? 'h-4 w-4' : 'h-2.5 w-2.5',
          size === 'md'
            ? checked ? 'translate-x-6' : 'translate-x-1'
            : checked ? 'translate-x-3.5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

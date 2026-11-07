type StatusSwitchProps = {
  value: boolean
  onChange: (implemented: boolean) => void
}

export function StatusSwitch({ value, onChange }: StatusSwitchProps) {
  return (
    <div className="inline-flex rounded-full bg-[#eef2f6] p-0.5 ring-1 ring-[#d5dee8]" role="group" aria-label="Статус этапа">
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(true)}
        className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
          value ? 'bg-[#0e7a45] text-white' : 'text-[#33475b]'
        }`}
      >
        Реализовано
      </button>
      <button
        type="button"
        aria-pressed={!value}
        onClick={() => onChange(false)}
        className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
          !value ? 'bg-[#5c6b7e] text-white' : 'text-[#33475b]'
        }`}
      >
        Не реализовано
      </button>
    </div>
  )
}

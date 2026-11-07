import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { formatEditable, formatTyping, parseEditable } from '../finance/format'

type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  min?: number
  max?: number
  decimals?: number
  hint?: string
  compact?: boolean
  testId?: string
  inputId?: string
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max,
  decimals = 0,
  hint,
  compact = false,
  testId,
  inputId,
}: NumberFieldProps) {
  const autoId = useId()
  const id = inputId ?? autoId
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)
  const [text, setText] = useState(() => formatEditable(value, decimals))
  const [focused, setFocused] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useLayoutEffect(() => {
    const pos = caretRef.current
    const node = inputRef.current
    if (pos === null || !node || document.activeElement !== node) return
    node.setSelectionRange(pos, pos)
    caretRef.current = null
  }, [text])

  useEffect(() => {
    if (!focused) setText(formatEditable(value, decimals))
  }, [value, decimals, focused])

  function commit(raw: string) {
    const parsed = parseEditable(raw)
    if (parsed === null) {
      setMessage('Введите число: ноль или больше')
      setText(formatEditable(value, decimals))
      return
    }

    let next = parsed
    let note: string | null = null
    if (next < min) {
      next = min
      note = `Минимум ${formatEditable(min, decimals)}`
    }
    if (max !== undefined && next > max) {
      next = max
      note = `Максимум ${formatEditable(max, decimals)}`
    }
    const factor = 10 ** decimals
    next = Math.round(next * factor) / factor
    setMessage(note)
    onChange(next)
    setText(formatEditable(next, decimals))
  }

  return (
    <label className="block" htmlFor={id}>
      <span className={`block font-semibold text-[#33475b] ${compact ? 'text-xs' : 'text-sm'}`}>
        {label}
      </span>
      <span
        className={`mt-1.5 flex items-center rounded-xl border bg-[#e8f2fc] focus-within:border-[#1d4e89] focus-within:ring-2 focus-within:ring-[#1d4e89]/20 ${
          message ? 'border-[#d92d20]' : 'border-[#c5ddf5]'
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          data-testid={testId}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          className={`w-full min-w-0 bg-transparent font-semibold text-[#0b2545] outline-none tabular-nums ${
            compact ? 'px-3 py-2 text-sm' : 'px-3.5 py-3 text-lg'
          }`}
          value={text}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            commit(text)
          }}
          onChange={(event) => {
            const raw = event.target.value
            const caret = event.target.selectionStart ?? raw.length
            const digitsRight = raw.slice(caret).replace(/\D/g, '').length
            const next = formatTyping(raw, decimals)
            caretRef.current = caretFromTrailingDigits(next, digitsRight)
            setText(next)
            setMessage(null)
            const parsed = parseEditable(next)
            if (parsed === null || parsed < min) return
            if (max !== undefined && parsed > max) {
              const limited = max
              setMessage(`Максимум ${formatEditable(limited, decimals)}`)
              caretRef.current = null
              setText(formatEditable(limited, decimals))
              onChange(limited)
              return
            }
            onChange(parsed)
          }}
        />
        {suffix ? <span className="shrink-0 pr-3 text-sm font-medium text-[#5c6b7e]">{suffix}</span> : null}
      </span>
      {hint ? <span className="mt-1 block text-xs leading-5 text-[#5c6b7e]">{hint}</span> : null}
      {message ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{message}</span> : null}
    </label>
  )
}

function caretFromTrailingDigits(formatted: string, digitsRight: number): number {
  if (digitsRight <= 0) return formatted.length
  let seen = 0
  for (let index = formatted.length - 1; index >= 0; index -= 1) {
    if (/\d/.test(formatted[index] ?? '')) {
      seen += 1
      if (seen === digitsRight) return index
    }
  }
  return 0
}

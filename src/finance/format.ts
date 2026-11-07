const moneyFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${moneyFormat.format(Math.round(value))} сум`
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${oneDecimal.format(value)}%`
}

export function formatMonths(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${oneDecimal.format(value)} мес.`
}

export function formatPayback(months: number | null): string {
  if (months === null) return 'Не окупается'
  if (Math.round(months * 10) / 10 === 0) return '0 мес.'
  return formatMonths(months)
}

export function formatRoi(percent: number | null): string {
  if (percent === null) return 'Не определяется'
  return formatPercent(percent)
}

export function formatReduction(percent: number | null): string {
  if (percent === null) return 'Не рассчитывается'
  return formatPercent(percent)
}

export function formatQuantity(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)
}

export function yearWord(years: number): string {
  const absolute = Math.abs(Math.trunc(years)) % 100
  const last = absolute % 10
  if (absolute > 10 && absolute < 20) return 'лет'
  if (last === 1) return 'год'
  if (last >= 2 && last <= 4) return 'года'
  return 'лет'
}

const integerFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const groupSeparator = integerFormat.format(1000).replace(/\d/g, '')

export function formatEditable(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(value)
}

function groupDigits(digits: string): string {
  if (digits.length <= 15) return integerFormat.format(Number(digits))
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
}

/** Группирует разряды прямо во время набора, сохраняя запятую и уже введенную дробную часть. */
export function formatTyping(raw: string, decimals: number): string {
  const cleaned = raw.replace(/[\s\u00a0\u202f\u2009]/g, '')
  if (cleaned === '') return ''
  const match = /^(\d*)([.,])?(\d*)/.exec(cleaned)
  if (!match) return ''

  let intDigits = match[1] ?? ''
  const separator = match[2]
  let fraction = match[3] ?? ''
  if (decimals <= 0) {
    fraction = ''
  } else {
    fraction = fraction.slice(0, decimals)
  }
  intDigits = intDigits.replace(/^0+(?=\d)/, '')
  if (intDigits === '' && (separator || fraction)) intDigits = '0'
  if (intDigits === '') return ''

  const grouped = groupDigits(intDigits)
  if (decimals > 0 && separator) return `${grouped},${fraction}`
  return grouped
}

export function parseEditable(text: string): number | null {
  const cleaned = text.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')
  if (cleaned === '') return 0
  if (!/^\d+(\.\d*)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

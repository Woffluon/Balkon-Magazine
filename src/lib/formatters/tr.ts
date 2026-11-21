const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const TR_DATE_ONLY_REGEX = /^(\d{2})\.(\d{2})\.(\d{4})$/

const trDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const trTimeShortFormatter = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
})

const trTimeFullFormatter = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  hourCycle: 'h23',
})

const trDefaultNumberFormatter = new Intl.NumberFormat('tr-TR')

const trCollator = new Intl.Collator('tr-TR', {
  sensitivity: 'base',
  numeric: true,
})

function buildVerifiedLocalDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/**
 * Parses date inputs safely in local time so `YYYY-MM-DD` strings never shift
 * backward by a day due to UTC midnight interpretation.
 */
export function parseLocalDateTR(input: string | Date | null | undefined): Date | null {
  if (input === null || input === undefined) {
    return null
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : new Date(input.getTime())
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const isoDateMatch = DATE_ONLY_REGEX.exec(trimmed)
  if (isoDateMatch) {
    return buildVerifiedLocalDate(
      Number(isoDateMatch[1]),
      Number(isoDateMatch[2]),
      Number(isoDateMatch[3])
    )
  }

  const trDateMatch = TR_DATE_ONLY_REGEX.exec(trimmed)
  if (trDateMatch) {
    return buildVerifiedLocalDate(
      Number(trDateMatch[3]),
      Number(trDateMatch[2]),
      Number(trDateMatch[1])
    )
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Formats a date in Turkish `GG.AA.YYYY` format, returning `'-'` when invalid or missing.
 */
export function formatDateTR(input: string | Date | null | undefined): string {
  const date = parseLocalDateTR(input)
  return date ? trDateFormatter.format(date) : '-'
}

/**
 * Formats a time in 24-hour Turkish `SS:DD` or `SS:DD:sn` format.
 */
export function formatTimeTR(
  input: string | Date | null | undefined,
  includeSeconds = false
): string {
  const date = parseLocalDateTR(input)
  if (!date) {
    return '-'
  }
  return includeSeconds
    ? trTimeFullFormatter.format(date)
    : trTimeShortFormatter.format(date)
}

/**
 * Formats a date and time in `GG.AA.YYYY SS:DD` format.
 */
export function formatDateTimeTR(input: string | Date | null | undefined): string {
  const date = parseLocalDateTR(input)
  if (!date) {
    return '-'
  }
  return `${trDateFormatter.format(date)} ${trTimeShortFormatter.format(date)}`
}

/**
 * Formats finite numbers using `tr-TR` grouping and decimal separators (`1.234,56`).
 */
export function formatNumberTR(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-'
  }
  if (!options) {
    return trDefaultNumberFormatter.format(value)
  }
  return new Intl.NumberFormat('tr-TR', options).format(value)
}

/**
 * Formats byte counts in Turkish units (`bayt`, `KB`, `MB`, `GB`) with `tr-TR` decimals.
 */
export function formatFileSizeTR(bytes: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return '0 bayt'
  }

  if (bytes < 1024) {
    return `${formatNumberTR(Math.round(bytes))} bayt`
  }

  if (bytes < 1024 * 1024) {
    return `${formatNumberTR(bytes / 1024, { maximumFractionDigits: 1 })} KB`
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${formatNumberTR(bytes / (1024 * 1024), { maximumFractionDigits: 1 })} MB`
  }

  return `${formatNumberTR(bytes / (1024 * 1024 * 1024), { maximumFractionDigits: 2 })} GB`
}

/**
 * Normalizes search text for Turkish case folding (`İ/i`, `I/ı`) and removes stray
 * Unicode combining dot-above marks (`U+0307`) after NFC composition.
 */
export function normalizeSearchTR(value: string): string {
  return value
    .trim()
    .normalize('NFC')
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0307/g, '')
}

/**
 * Compares two strings using Turkish collation with base sensitivity and numeric sorting.
 */
export function compareTR(a: string, b: string): number {
  return trCollator.compare(a, b)
}

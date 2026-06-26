import { formatDisplayDate } from './format'
import { formatOraDisplay as sharedFormatOraDisplay } from '@inventari/shared'

export function formatDisplayTime(ora: string | null | undefined): string {
  return sharedFormatOraDisplay(ora)
}

export function formatActionDateTime(
  data: string,
  ora: string | null | undefined,
): string {
  const date = formatDisplayDate(data)
  const time = formatDisplayTime(ora)
  return time ? `${time} · ${date}` : date
}

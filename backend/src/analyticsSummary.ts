export type CountrySummary = {
  in_qty: number
  in_value: number
  out_qty: number
  out_value: number
}

export type SummaryByCountry = {
  XK: CountrySummary
  AL: CountrySummary
}

type SummaryActionRow = {
  lloji: 'Hyrje' | 'Dalje'
  shteti: 'XK' | 'AL'
  sasia: number | string | null
  totali: number | string | null
}

function emptyCountrySummary(): CountrySummary {
  return { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
}

export function buildSummaryByCountry(rows: SummaryActionRow[]): SummaryByCountry {
  const summaries: SummaryByCountry = {
    XK: emptyCountrySummary(),
    AL: emptyCountrySummary(),
  }

  for (const row of rows) {
    if (row.shteti !== 'XK' && row.shteti !== 'AL') continue

    const qty = Number(row.sasia ?? 0)
    const total = Number(row.totali ?? 0)
    const summary = summaries[row.shteti]

    if (row.lloji === 'Hyrje') {
      summary.in_qty += qty
      summary.in_value += total
    } else if (row.lloji === 'Dalje') {
      summary.out_qty += qty
      summary.out_value += total
    }
  }

  return summaries
}

import type ExcelJS from 'exceljs'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 11,
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  right: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
}

const NO_WRAP_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  wrapText: false,
  vertical: 'middle',
}

export function styleHeaderRow(worksheet: ExcelJS.Worksheet): void {
  const headerRow = worksheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
    cell.alignment = NO_WRAP_ALIGNMENT
  })
}

function cellDisplayLength(cell: ExcelJS.Cell): number {
  const value = cell.value
  if (value === null || value === undefined) return 0

  if (typeof value === 'object' && value !== null && 'richText' in value) {
    return value.richText.map((part) => part.text ?? '').join('').length
  }

  if (typeof value === 'number') {
    const fmt = cell.numFmt
    if (fmt?.includes('#,##0.00')) {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).length
    }
    if (fmt?.includes('#,##0')) {
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 }).length
    }
    return String(value).length
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('en-GB').length
  }

  return String(value).length
}

export function autoSizeColumns(
  worksheet: ExcelJS.Worksheet,
  maxWidth = 120,
  columnCount?: number,
): void {
  const lastColumn = columnCount ?? worksheet.columnCount

  for (let colNumber = 1; colNumber <= lastColumn; colNumber += 1) {
    let maxLen = 0

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const cell = row.getCell(colNumber)
      maxLen = Math.max(maxLen, cellDisplayLength(cell))
    })

    worksheet.getColumn(colNumber).width = Math.min(Math.max(maxLen + 2, 8), maxWidth)
  }
}

export function applyBordersToDataRows(worksheet: ExcelJS.Worksheet, startRow: number): void {
  const rowCount = worksheet.rowCount
  for (let rowNum = startRow; rowNum <= rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum)
    row.eachCell((cell) => {
      cell.border = THIN_BORDER
      cell.alignment = NO_WRAP_ALIGNMENT
    })
  }
}

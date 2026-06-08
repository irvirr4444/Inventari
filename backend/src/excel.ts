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

export function autoSizeColumns(worksheet: ExcelJS.Worksheet, maxWidth = 80): void {
  worksheet.columns.forEach((column) => {
    let maxLen = 0
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value
      if (cellValue !== null && cellValue !== undefined) {
        maxLen = Math.max(maxLen, String(cellValue).length)
      }
    })
    const width = Math.min(maxLen + 2, maxWidth)
    column.width = width > 0 ? width : 10
  })
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

import PDFDocument from 'pdfkit'
import {
  DEJAVU_SANS_BOLD_PATH,
  DEJAVU_SANS_PATH,
  type HistoryReportDocument,
} from './historyReportData.js'
import { fmtEuro, fmtInt, LLOJI_BADGE_COLORS } from './historyReportFormat.js'

const MM_TO_PT = 72 / 25.4
const PAGE_MARGIN = 14 * MM_TO_PT
const CARD_GAP = 16
const CARD_RADIUS = 6
const CARD_BORDER = '#d1d5db'
const HEADER_RULE = '#111827'

function ensureSpace(doc: InstanceType<typeof PDFDocument>, height: number) {
  const bottom = doc.page.height - PAGE_MARGIN
  if (doc.y + height > bottom) {
    doc.addPage()
  }
}

function drawFilterChip(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  text: string,
): number {
  doc.font('DejaVu').fontSize(9)
  const textWidth = doc.widthOfString(text)
  const padX = 10
  const padY = 4
  const chipWidth = textWidth + padX * 2
  const chipHeight = 18

  doc
    .roundedRect(x, y, chipWidth, chipHeight, 999)
    .fill('#eef2ff')

  doc.fillColor('#3730a3').text(text, x + padX, y + padY - 1, {
    width: textWidth,
    lineBreak: false,
  })

  return chipWidth + 8
}

function drawBadge(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  lloji: HistoryReportDocument['actions'][number]['lloji'],
) {
  const colors = LLOJI_BADGE_COLORS[lloji]
  doc.font('DejaVu-Bold').fontSize(9)
  const textWidth = doc.widthOfString(lloji)
  const padX = 10
  const chipWidth = textWidth + padX * 2
  const chipHeight = 18

  doc
    .roundedRect(x - chipWidth, y, chipWidth, chipHeight, 999)
    .fill(colors.fill)

  doc.fillColor(colors.text).text(lloji, x - chipWidth + padX, y + 4, {
    width: textWidth,
    lineBreak: false,
  })
}

export function buildHistoryReportPdfBuffer(doc: HistoryReportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const pdf = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, autoFirstPage: true })

    pdf.on('data', (chunk: Buffer) => chunks.push(chunk))
    pdf.on('end', () => resolve(Buffer.concat(chunks)))
    pdf.on('error', reject)

    pdf.registerFont('DejaVu', DEJAVU_SANS_PATH)
    pdf.registerFont('DejaVu-Bold', DEJAVU_SANS_BOLD_PATH)

    const contentWidth = pdf.page.width - PAGE_MARGIN * 2
    const rightEdge = pdf.page.width - PAGE_MARGIN

    pdf.font('DejaVu-Bold').fontSize(24).fillColor('#111827').text(doc.title, {
      width: contentWidth,
    })
    pdf.moveDown(0.25)
    pdf
      .font('DejaVu')
      .fontSize(11)
      .fillColor('#6b7280')
      .text(`Gjeneruar më ${doc.generatedAt}`, { width: contentWidth })
    pdf.moveDown(0.5)

    if (doc.filterLines.length > 0) {
      let chipX = PAGE_MARGIN
      let chipY = pdf.y
      const maxX = rightEdge
      for (const line of doc.filterLines) {
        const chipWidth = 18 + pdf.widthOfString(line) + 20
        if (chipX + chipWidth > maxX && chipX > PAGE_MARGIN) {
          chipX = PAGE_MARGIN
          chipY += 26
        }
        const used = drawFilterChip(pdf, chipX, chipY, line)
        chipX += used
      }
      pdf.y = chipY + 28
    } else {
      pdf.fontSize(12).fillColor('#4b5563').text('Të gjitha veprimet', { width: contentWidth })
      pdf.moveDown(0.75)
    }

    const ruleY = pdf.y
    pdf
      .moveTo(PAGE_MARGIN, ruleY)
      .lineTo(rightEdge, ruleY)
      .lineWidth(2)
      .strokeColor(HEADER_RULE)
      .stroke()
    pdf.y = ruleY + 20
    pdf.fillColor('#111827')

    for (const action of doc.actions) {
      const headerLine = action.ora ? `${action.data} · ${action.ora}` : action.data

      ensureSpace(pdf, 80)

      const cardTop = pdf.y
      const cardLeft = PAGE_MARGIN
      let cursorY = cardTop

      pdf.rect(cardLeft, cardTop, contentWidth, 42).fill('#fafafa')

      cursorY = cardTop + 14
      pdf
        .font('DejaVu-Bold')
        .fontSize(12)
        .fillColor('#111827')
        .text(headerLine, cardLeft + 16, cursorY, {
          width: contentWidth - 110,
          lineBreak: false,
        })

      drawBadge(pdf, cardLeft + contentWidth - 16, cursorY - 2, action.lloji)

      cursorY += 18
      pdf.font('DejaVu').fontSize(10).fillColor('#4b5563')
      if (action.route) {
        pdf.text(action.route, cardLeft + 16, cursorY, { width: contentWidth - 32 })
        cursorY += 13
      }
      if (action.pershkrimi) {
        pdf.text(action.pershkrimi, cardLeft + 16, cursorY, {
          width: contentWidth - 32,
        })
        cursorY += 13
      }

      const bodyTop = Math.max(cursorY + 6, cardTop + 44)
      cursorY = bodyTop
      pdf
        .moveTo(cardLeft + 16, bodyTop - 4)
        .lineTo(cardLeft + contentWidth - 16, bodyTop - 4)
        .lineWidth(1)
        .strokeColor('#e5e7eb')
        .stroke()

      for (const item of action.items) {
        pdf.font('DejaVu').fontSize(10).fillColor('#111827')
        pdf.text(item.productLabel, cardLeft + 16, cursorY, {
          width: contentWidth - 130,
          lineBreak: false,
        })
        pdf.text(`${fmtInt(item.qty)} copë`, cardLeft + contentWidth - 114, cursorY, {
          width: 52,
          align: 'right',
          lineBreak: false,
        })
        if (doc.trackPrice) {
          pdf.text(fmtEuro(item.totali), cardLeft + contentWidth - 58, cursorY, {
            width: 42,
            align: 'right',
            lineBreak: false,
          })
        }
        cursorY += 14

        if (item.shenim) {
          pdf.fontSize(9).fillColor('#6b7280').text(item.shenim, cardLeft + 16, cursorY, {
            width: contentWidth - 32,
          })
          cursorY += 12
        }

        pdf
          .moveTo(cardLeft + 16, cursorY)
          .lineTo(cardLeft + contentWidth - 16, cursorY)
          .lineWidth(1)
          .strokeColor('#f3f4f6')
          .stroke()
        cursorY += 8
      }

      if (doc.trackPrice) {
        pdf
          .moveTo(cardLeft + 16, cursorY)
          .lineTo(cardLeft + contentWidth - 16, cursorY)
          .lineWidth(1)
          .strokeColor('#e5e7eb')
          .stroke()
        cursorY += 10
        pdf
          .font('DejaVu-Bold')
          .fontSize(11)
          .fillColor('#111827')
          .text(`Totali: ${fmtEuro(action.actionTotal)}`, cardLeft + 16, cursorY, {
            width: contentWidth - 32,
            align: 'right',
          })
        cursorY += 16
      }

      const cardHeight = cursorY - cardTop + 8
      pdf
        .roundedRect(cardLeft, cardTop, contentWidth, cardHeight, CARD_RADIUS)
        .lineWidth(1)
        .strokeColor(CARD_BORDER)
        .stroke()

      pdf.y = cardTop + cardHeight + CARD_GAP
    }

    pdf.end()
  })
}

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { HistoryReportDocument } from './historyReportData.js'
import { fmtEuro, fmtInt, LLOJI_BADGE_COLORS } from './historyReportFormat.js'

const CARD_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
}

function filterChipParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: ` ${text} `,
        size: 18,
        color: '3730A3',
        shading: { type: ShadingType.CLEAR, fill: 'EEF2FF', color: 'auto' },
      }),
    ],
  })
}

function badgeRun(lloji: HistoryReportDocument['actions'][number]['lloji']): TextRun {
  const colors = LLOJI_BADGE_COLORS[lloji]
  return new TextRun({
    text: ` ${lloji} `,
    bold: true,
    size: 18,
    color: colors.text.replace('#', ''),
    shading: { type: ShadingType.CLEAR, fill: colors.fill.replace('#', ''), color: 'auto' },
  })
}

function actionCard(doc: HistoryReportDocument, action: HistoryReportDocument['actions'][number]) {
  const header = action.ora ? `${action.data} · ${action.ora}` : action.data
  const headerChildren: TextRun[] = [
    new TextRun({ text: header, bold: true, size: 24 }),
    new TextRun({ text: '   ' }),
    badgeRun(action.lloji),
  ]

  const headerParagraphs: Paragraph[] = [
    new Paragraph({ children: headerChildren, spacing: { after: 80 } }),
  ]

  if (action.route) {
    headerParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: action.route, size: 20, color: '4B5563' })],
        spacing: { after: 60 },
      }),
    )
  }
  if (action.pershkrimi) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: action.pershkrimi, italics: true, size: 20, color: '4B5563' }),
        ],
        spacing: { after: 80 },
      }),
    )
  }

  const itemRows: TableRow[] = action.items.map((item) => {
    const cells = [
      new TableCell({
        borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'F3F4F6' } },
        children: [
          new Paragraph({
            children: [new TextRun({ text: item.productLabel, size: 20 })],
          }),
          ...(item.shenim
            ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: item.shenim, italics: true, color: '6B7280', size: 18 }),
                  ],
                }),
              ]
            : []),
        ],
      }),
      new TableCell({
        borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'F3F4F6' } },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `${fmtInt(item.qty)} copë`, size: 20 })],
          }),
        ],
      }),
    ]

    if (doc.trackPrice) {
      cells.push(
        new TableCell({
          borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'F3F4F6' } },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: fmtEuro(item.totali), size: 20 })],
            }),
          ],
        }),
      )
    }

    return new TableRow({ children: cells })
  })

  if (doc.trackPrice) {
    itemRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Totali: ${fmtEuro(action.actionTotal)}`,
                    bold: true,
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    )
  }

  const itemTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: itemRows,
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: CARD_BORDER,
            shading: { type: ShadingType.CLEAR, fill: 'FAFAFA', color: 'auto' },
            children: headerParagraphs,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: CARD_BORDER,
            children: [itemTable],
          }),
        ],
      }),
    ],
  })
}

export async function buildHistoryReportDocxBuffer(doc: HistoryReportDocument): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: doc.title, bold: true, size: 48 })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Gjeneruar më ${doc.generatedAt}`,
          color: '6B7280',
          size: 22,
        }),
      ],
      spacing: { after: 160 },
    }),
  ]

  if (doc.filterLines.length > 0) {
    for (const line of doc.filterLines) {
      children.push(filterChipParagraph(line))
    }
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Të gjitha veprimet', color: '4B5563', size: 22 })],
        spacing: { after: 160 },
      }),
    )
  }

  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: '111827', space: 4 },
      },
      spacing: { after: 240 },
    }),
  )

  for (const action of doc.actions) {
    children.push(actionCard(doc, action))
    children.push(new Paragraph({ text: '', spacing: { after: 160 } }))
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(document)
}

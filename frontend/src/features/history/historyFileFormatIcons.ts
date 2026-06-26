import type { HistoryDocumentFormat } from '../../lib/historyDocumentDownload'

export const HISTORY_FILE_FORMAT_ICONS: Record<
  HistoryDocumentFormat,
  { src: string; alt: string }
> = {
  xlsx: {
    src: '/icons/file-formats/microsoft-excel.png',
    alt: 'Microsoft Excel',
  },
  pdf: {
    src: '/icons/file-formats/pdf.webp',
    alt: 'PDF',
  },
  docx: {
    src: '/icons/file-formats/microsoft-word.png',
    alt: 'Microsoft Word',
  },
}

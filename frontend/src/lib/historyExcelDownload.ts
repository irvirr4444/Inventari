export {
  downloadHistoryDocument,
  type HistoryDocumentFormat,
} from './historyDocumentDownload'

import { downloadHistoryDocument } from './historyDocumentDownload'

/** @deprecated Use downloadHistoryDocument('xlsx', opts) */
export async function downloadHistoryExcel(
  opts: Parameters<typeof downloadHistoryDocument>[1],
): Promise<void> {
  return downloadHistoryDocument('xlsx', opts)
}

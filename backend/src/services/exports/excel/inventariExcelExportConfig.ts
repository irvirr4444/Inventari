import { resolveActionCreatorUserId } from '@inventari/shared'

export type InventariExcelExportOptions = {
  includeCreator?: boolean
}

export const DEFAULT_INVENTARI_EXCEL_EXPORT_OPTIONS: Required<InventariExcelExportOptions> = {
  includeCreator: false,
}

export function resolveInventariExcelExportOptions(
  overrides?: InventariExcelExportOptions,
): Required<InventariExcelExportOptions> {
  return {
    includeCreator:
      overrides?.includeCreator ?? DEFAULT_INVENTARI_EXCEL_EXPORT_OPTIONS.includeCreator,
  }
}

export function inventariExcelIncludesCreator(options?: InventariExcelExportOptions): boolean {
  return resolveInventariExcelExportOptions(options).includeCreator
}

export type InventariExportCreatorContext = {
  creatorLabelById: Map<string, string>
  accountOwnerId: string
}

export type InventariExcelExportConfig = InventariExcelExportOptions & {
  creator?: InventariExportCreatorContext
}

type ActionCreatorRow = Parameters<typeof resolveActionCreatorUserId>[0]

export function resolveExportCreatorLabel(
  action: ActionCreatorRow,
  config?: InventariExcelExportConfig,
): string {
  if (!inventariExcelIncludesCreator(config) || !config?.creator) return ''
  const id = resolveActionCreatorUserId(action, config.creator.accountOwnerId)
  return config.creator.creatorLabelById.get(id) ?? id
}

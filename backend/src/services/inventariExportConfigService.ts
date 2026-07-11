import type { SupabaseClient } from '@supabase/supabase-js'
import { showPerdoruesiControls } from '@inventari/shared'
import type { PerdoruesRow } from '../domain/user.js'
import { listVeprimBatchCreatorUserIds } from '../repositories/veprimBatchRepository.js'
import {
  resolveInventariExcelExportOptions,
  type InventariExcelExportConfig,
  type InventariExcelExportOptions,
} from './inventariExcel.js'

export function buildInventariExcelExportConfig(
  tenantId: string,
  creatorLabelById: Map<string, string>,
  overrides?: InventariExcelExportOptions,
): InventariExcelExportConfig {
  const options = resolveInventariExcelExportOptions(overrides)
  return {
    includeCreator: options.includeCreator,
    creator: options.includeCreator
      ? { creatorLabelById, accountOwnerId: tenantId }
      : undefined,
  }
}

export async function resolveInventariExcelExportConfigForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  users: PerdoruesRow[],
  creatorLabelById: Map<string, string>,
): Promise<InventariExcelExportConfig> {
  const creatorUserIds = await listVeprimBatchCreatorUserIds(supabase, tenantId)
  const includeCreator = showPerdoruesiControls(
    users.map((user) => ({ id: user.id, role: user.role, aktiv: user.aktiv })),
    creatorUserIds,
  )
  return buildInventariExcelExportConfig(tenantId, creatorLabelById, { includeCreator })
}

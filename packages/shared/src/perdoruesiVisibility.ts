export type PerdoruesiVisibilityUser = {
  id: string
  role: 'admin' | 'perdorues'
  aktiv: boolean
}

export function showPerdoruesiControls(
  users: PerdoruesiVisibilityUser[],
  creatorUserIds: Iterable<string>,
): boolean {
  const regularUserIds = new Set(
    users.filter((user) => user.role === 'perdorues').map((user) => user.id),
  )
  const hasActiveRegularUser = users.some((user) => user.role === 'perdorues' && user.aktiv)
  const hasHistoricalRegularUser = [...creatorUserIds].some((id) => regularUserIds.has(id))
  return hasActiveRegularUser || hasHistoricalRegularUser
}

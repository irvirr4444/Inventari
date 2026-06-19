import { useQuery } from '@tanstack/react-query'
import { listDynamicProducts } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { useAuth } from '../lib/auth/AuthProvider'

export function useDynamicProductsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.products(user?.id),
    queryFn: () => listDynamicProducts({}),
    enabled: Boolean(user),
    placeholderData: [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

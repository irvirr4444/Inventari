import { useQuery } from '@tanstack/react-query'
import { listProducts } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

export function useProductsQuery() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: () => listProducts({}),
    placeholderData: [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

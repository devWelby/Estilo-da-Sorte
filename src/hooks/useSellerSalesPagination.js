import { useCallback, useEffect, useState } from 'react';
import { getSellerSalesPage } from '../data/repositories/salesRepository';

export function useSellerSalesPagination(vendedorId) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);

  const loadFirstPage = useCallback(async () => {
    if (!vendedorId) {
      setSales([]);
      setHasMore(false);
      setCursor(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const page = await getSellerSalesPage(vendedorId, null, 20);
      setSales(page.items);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [vendedorId]);

  const loadMore = useCallback(async () => {
    if (!vendedorId || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const page = await getSellerSalesPage(vendedorId, cursor, 20);
      setSales((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [vendedorId, hasMore, loadingMore, cursor]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  return {
    sales,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh: loadFirstPage
  };
}

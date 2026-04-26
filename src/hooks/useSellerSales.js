import { useEffect, useState } from 'react';
import { observeSellerSales } from '../data/repositories/salesRepository';

export function useSellerSales(vendedorId) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendedorId) {
      setLoading(false);
      return undefined;
    }
    return observeSellerSales(vendedorId, (items) => {
      setSales(items);
      setLoading(false);
    }, () => setLoading(false));
  }, [vendedorId]);

  return { sales, loading };
}

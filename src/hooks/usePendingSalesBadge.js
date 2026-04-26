import { useEffect, useState } from 'react';
import { observePendingSalesCount } from '../data/repositories/salesRepository';

export function usePendingSalesBadge(vendedorId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!vendedorId) return undefined;
    return observePendingSalesCount(vendedorId, setCount, () => setCount(0));
  }, [vendedorId]);

  return count;
}

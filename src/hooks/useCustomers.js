import { useEffect, useMemo, useState } from 'react';
import { listCustomers } from '../data/repositories/customerRepository';
import { normalizeSearch } from '../utils/formatters';
import { useDebouncedValue } from './useDebouncedValue';

export function useCustomers(search = '') {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await listCustomers();
        if (mounted) {
          setItems(data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const value = normalizeSearch(debouncedSearch);
    if (!value) return items;
    return items.filter((item) => normalizeSearch(`${item.nome} ${item.email}`).includes(value));
  }, [items, debouncedSearch]);

  return { customers: filtered, loading };
}
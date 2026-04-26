import { useEffect, useMemo, useState } from 'react';
import { observeCustomers } from '../data/repositories/customerRepository';
import { normalizeSearch } from '../utils/formatters';
import { useDebouncedValue } from './useDebouncedValue';

export function useCustomers(search = '') {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    return observeCustomers((data) => {
      setItems(data);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const value = normalizeSearch(debouncedSearch);
    if (!value) return items;
    return items.filter((item) => normalizeSearch(`${item.nome} ${item.email} ${item.cpf}`).includes(value));
  }, [items, debouncedSearch]);

  return { customers: filtered, loading };
}

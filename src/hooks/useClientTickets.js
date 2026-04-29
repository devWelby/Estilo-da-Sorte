import { useEffect, useState } from 'react';
import { observeClientTickets } from '../data/repositories/ticketRepository';

export function useClientTickets(clienteId) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId) {
      setLoading(false);
      return undefined;
    }

    return observeClientTickets(clienteId, (items) => {
      setTickets(items);
      setLoading(false);
    }, () => setLoading(false));
  }, [clienteId]);

  return { tickets, loading };
}
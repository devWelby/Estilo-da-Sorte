import { useEffect, useState } from 'react';
import { observeLotteries, observeActiveLotteries, observeFinishedLotteries } from '../data/repositories/lotteryRepository';

function useObserve(subscribe) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      setItems(data);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });
    return unsubscribe;
  }, [subscribe]);

  return { items, loading, error };
}

export function useLotteries() {
  return useObserve(observeLotteries);
}

export function useActiveLotteries() {
  return useObserve(observeActiveLotteries);
}

export function useFinishedLotteries() {
  return useObserve(observeFinishedLotteries);
}

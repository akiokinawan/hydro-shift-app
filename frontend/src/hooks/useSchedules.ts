import useSWR from 'swr';
import { fetchSchedules, Schedule } from '../lib/api';

// SWRのfetcher関数
const fetcher = ([fieldId, month]: [number, string]) => fetchSchedules(fieldId, month);

export const useSchedules = (fieldId: number | null, month: string) => {
  // fieldIdがnullの場合はリクエストを送信しない
  const { data, error, mutate } = useSWR<Schedule[]>(fieldId ? [fieldId, month] : null, fetcher);

  return {
    schedules: data,
    isLoading: !error && !data,
    isError: error,
    mutateSchedules: mutate, // キャッシュを手動で更新するための関数
  };
};

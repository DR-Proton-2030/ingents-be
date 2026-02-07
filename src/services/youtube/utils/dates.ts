export const formatDateISO = (d: Date) => d.toISOString().split("T")[0];

export const getCustomWindow = (days: number) => {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  const end = formatDateISO(new Date());
  const start = formatDateISO(
    new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000),
  );
  return { start, end, safeDays };
};

export const getTodayStr = () => formatDateISO(new Date());

export const getLast48hStartStr = () =>
  formatDateISO(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

export const getLast28dStartStr = () =>
  formatDateISO(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000));

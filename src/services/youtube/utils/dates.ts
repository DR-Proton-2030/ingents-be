export const formatDateISO = (d: Date) => d.toISOString().split("T")[0];

export type YouTubeAnalyticsDateRange =
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_28_DAYS"
  | "LAST_90_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LIFETIME"
  | "CUSTOM";

export type YouTubeCustomRange = {
  startDate: string;
  endDate: string;
};

const isYMD = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

const parseYMD = (ymd: string): Date | null => {
  if (!isYMD(ymd)) return null;
  const [yy, mm, dd] = ymd.split("-").map((x) => Number(x));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd))
    return null;
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  return formatDateISO(d) === ymd ? d : null;
};

const shiftDays = (ymd: string, days: number) => {
  const d = parseYMD(ymd);
  if (!d) return ymd;
  return formatDateISO(new Date(d.getTime() + days * 24 * 60 * 60 * 1000));
};

export const getYesterdayStr = () =>
  formatDateISO(new Date(Date.now() - 24 * 60 * 60 * 1000));

export const resolveYouTubeAnalyticsWindow = (args: {
  dateRange?: YouTubeAnalyticsDateRange;
  customRange?: Partial<YouTubeCustomRange> | null;
  // Backward-compat: old `days` query
  days?: number | string | null;
  defaultRange?: YouTubeAnalyticsDateRange;
}) => {
  const dateRange =
    (args.dateRange as YouTubeAnalyticsDateRange | undefined) ||
    (args.defaultRange as YouTubeAnalyticsDateRange | undefined) ||
    "LAST_28_DAYS";

  // Hard rule: never include today
  const maxEnd = getYesterdayStr();

  const clampEnd = (endYMD: string) => (endYMD > maxEnd ? maxEnd : endYMD);

  let start: string;
  let end: string;
  let customRange: YouTubeCustomRange | null = null;

  if (dateRange === "CUSTOM") {
    const cs = String(args.customRange?.startDate || "");
    const ce = String(args.customRange?.endDate || "");
    if (!isYMD(cs) || !isYMD(ce) || !parseYMD(cs) || !parseYMD(ce)) {
      const err: any = new Error(
        "customRange.startDate and customRange.endDate must be valid YYYY-MM-DD dates",
      );
      err.statusCode = 400;
      throw err;
    }
    end = clampEnd(ce);
    start = cs;
    if (end < start) {
      const err: any = new Error(
        "customRange.endDate must be <= yesterday and >= startDate",
      );
      err.statusCode = 400;
      throw err;
    }
    customRange = { startDate: cs, endDate: ce };
  } else if (dateRange === "YESTERDAY") {
    start = maxEnd;
    end = maxEnd;
  } else if (dateRange === "LAST_7_DAYS") {
    end = maxEnd;
    start = shiftDays(end, -6);
  } else if (dateRange === "LAST_28_DAYS") {
    end = maxEnd;
    start = shiftDays(end, -27);
  } else if (dateRange === "LAST_90_DAYS") {
    end = maxEnd;
    start = shiftDays(end, -89);
  } else if (dateRange === "THIS_MONTH") {
    const now = new Date();
    start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
      2,
      "0",
    )}-01`;
    end = maxEnd;
    if (end < start) {
      start = maxEnd;
      end = maxEnd;
    }
  } else if (dateRange === "LAST_MONTH") {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const startD = new Date(Date.UTC(y, m - 1, 1));
    const endD = new Date(Date.UTC(y, m, 0));
    start = formatDateISO(startD);
    end = clampEnd(formatDateISO(endD));
  } else if (dateRange === "LIFETIME") {
    start = "2008-01-01";
    end = maxEnd;
  } else {
    // Backward-compat: ?days=30
    const daysRaw = Number(args.days);
    const safeDays = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 30;
    end = maxEnd;
    start = shiftDays(end, -1 * (safeDays - 1));
  }

  return {
    dateRange,
    start,
    end,
    customRange,
  };
};

export const getCustomWindow = (days: number) => {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  const end = getYesterdayStr();
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

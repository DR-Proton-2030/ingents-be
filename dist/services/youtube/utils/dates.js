"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLast28dStartStr = exports.getLast48hStartStr = exports.getTodayStr = exports.getCustomWindow = exports.resolveYouTubeAnalyticsWindow = exports.getYesterdayStr = exports.formatDateISO = void 0;
const formatDateISO = (d) => d.toISOString().split("T")[0];
exports.formatDateISO = formatDateISO;
const isYMD = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const parseYMD = (ymd) => {
    if (!isYMD(ymd))
        return null;
    const [yy, mm, dd] = ymd.split("-").map((x) => Number(x));
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd))
        return null;
    const d = new Date(Date.UTC(yy, mm - 1, dd));
    return (0, exports.formatDateISO)(d) === ymd ? d : null;
};
const shiftDays = (ymd, days) => {
    const d = parseYMD(ymd);
    if (!d)
        return ymd;
    return (0, exports.formatDateISO)(new Date(d.getTime() + days * 24 * 60 * 60 * 1000));
};
const getYesterdayStr = () => (0, exports.formatDateISO)(new Date(Date.now() - 24 * 60 * 60 * 1000));
exports.getYesterdayStr = getYesterdayStr;
const resolveYouTubeAnalyticsWindow = (args) => {
    var _a, _b;
    const dateRange = args.dateRange ||
        args.defaultRange ||
        "LAST_28_DAYS";
    // Hard rule: never include today
    const maxEnd = (0, exports.getYesterdayStr)();
    const clampEnd = (endYMD) => (endYMD > maxEnd ? maxEnd : endYMD);
    let start;
    let end;
    let customRange = null;
    if (dateRange === "CUSTOM") {
        const cs = String(((_a = args.customRange) === null || _a === void 0 ? void 0 : _a.startDate) || "");
        const ce = String(((_b = args.customRange) === null || _b === void 0 ? void 0 : _b.endDate) || "");
        if (!isYMD(cs) || !isYMD(ce) || !parseYMD(cs) || !parseYMD(ce)) {
            const err = new Error("customRange.startDate and customRange.endDate must be valid YYYY-MM-DD dates");
            err.statusCode = 400;
            throw err;
        }
        end = clampEnd(ce);
        start = cs;
        if (end < start) {
            const err = new Error("customRange.endDate must be <= yesterday and >= startDate");
            err.statusCode = 400;
            throw err;
        }
        customRange = { startDate: cs, endDate: ce };
    }
    else if (dateRange === "YESTERDAY") {
        start = maxEnd;
        end = maxEnd;
    }
    else if (dateRange === "LAST_7_DAYS") {
        end = maxEnd;
        start = shiftDays(end, -6);
    }
    else if (dateRange === "LAST_28_DAYS") {
        end = maxEnd;
        start = shiftDays(end, -27);
    }
    else if (dateRange === "LAST_90_DAYS") {
        end = maxEnd;
        start = shiftDays(end, -89);
    }
    else if (dateRange === "THIS_MONTH") {
        const now = new Date();
        start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
        end = maxEnd;
        if (end < start) {
            start = maxEnd;
            end = maxEnd;
        }
    }
    else if (dateRange === "LAST_MONTH") {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        const startD = new Date(Date.UTC(y, m - 1, 1));
        const endD = new Date(Date.UTC(y, m, 0));
        start = (0, exports.formatDateISO)(startD);
        end = clampEnd((0, exports.formatDateISO)(endD));
    }
    else if (dateRange === "LIFETIME") {
        start = "2008-01-01";
        end = maxEnd;
    }
    else {
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
exports.resolveYouTubeAnalyticsWindow = resolveYouTubeAnalyticsWindow;
const getCustomWindow = (days) => {
    const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
    const end = (0, exports.getYesterdayStr)();
    const start = (0, exports.formatDateISO)(new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000));
    return { start, end, safeDays };
};
exports.getCustomWindow = getCustomWindow;
const getTodayStr = () => (0, exports.formatDateISO)(new Date());
exports.getTodayStr = getTodayStr;
const getLast48hStartStr = () => (0, exports.formatDateISO)(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
exports.getLast48hStartStr = getLast48hStartStr;
const getLast28dStartStr = () => (0, exports.formatDateISO)(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000));
exports.getLast28dStartStr = getLast28dStartStr;

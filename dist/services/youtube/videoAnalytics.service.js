"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSingleVideoAnalytics = void 0;
const iso_1 = require("./utils/iso");
const pad2 = (n) => String(Math.max(0, Math.trunc(n))).padStart(2, "0");
const toYMD = (d) => {
    const yyyy = d.getUTCFullYear();
    const mm = pad2(d.getUTCMonth() + 1);
    const dd = pad2(d.getUTCDate());
    return `${yyyy}-${mm}-${dd}`;
};
const yesterdayYMD = () => toYMD(new Date(Date.now() - 24 * 60 * 60 * 1000));
const clampEndDate = (startYMD, endYMD) => endYMD < startYMD ? startYMD : endYMD;
const isYMD = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const parseYMDToUTCDate = (ymd) => {
    if (!isYMD(ymd))
        return null;
    const [yy, mm, dd] = ymd.split("-").map((x) => Number(x));
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd))
        return null;
    if (mm < 1 || mm > 12)
        return null;
    if (dd < 1 || dd > 31)
        return null;
    const d = new Date(Date.UTC(yy, mm - 1, dd));
    // Validate round-trip (catches invalid days like 2026-02-31)
    return toYMD(d) === ymd ? d : null;
};
const shiftYMD = (ymd, daysDelta) => {
    const d = parseYMDToUTCDate(ymd);
    if (!d)
        return ymd;
    return toYMD(new Date(d.getTime() + daysDelta * 24 * 60 * 60 * 1000));
};
const maxYMD = (a, b) => (a > b ? a : b);
const minYMD = (a, b) => (a < b ? a : b);
const resolveVideoDateWindow = (args) => {
    const { dateRange, customRange, publishedAtYMD } = args;
    const effectiveRange = dateRange || "LAST_28_DAYS";
    // Hard rule: never include today
    const maxEnd = yesterdayYMD();
    const clampToPublished = (startYMD) => publishedAtYMD ? maxYMD(startYMD, publishedAtYMD) : startYMD;
    const end = (candidateEnd) => minYMD(candidateEnd, maxEnd);
    let startDate;
    let endDate;
    if (effectiveRange === "YESTERDAY") {
        startDate = maxEnd;
        endDate = maxEnd;
    }
    else if (effectiveRange === "LAST_7_DAYS") {
        endDate = maxEnd;
        startDate = shiftYMD(endDate, -6);
    }
    else if (effectiveRange === "LAST_28_DAYS") {
        endDate = maxEnd;
        startDate = shiftYMD(endDate, -27);
    }
    else if (effectiveRange === "LAST_90_DAYS") {
        endDate = maxEnd;
        startDate = shiftYMD(endDate, -89);
    }
    else if (effectiveRange === "THIS_MONTH") {
        const now = new Date();
        const thisMonthStart = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-01`;
        endDate = end(maxEnd);
        startDate = thisMonthStart;
        // If "this month" would require today (e.g., it's the 1st), fall back to yesterday.
        if (endDate < startDate) {
            startDate = maxEnd;
            endDate = maxEnd;
        }
    }
    else if (effectiveRange === "LAST_MONTH") {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        const lastMonthStartDate = new Date(Date.UTC(y, m - 1, 1));
        const lastMonthEndDate = new Date(Date.UTC(y, m, 0));
        startDate = toYMD(lastMonthStartDate);
        endDate = end(toYMD(lastMonthEndDate));
    }
    else if (effectiveRange === "LIFETIME") {
        startDate = publishedAtYMD || "2010-01-01";
        endDate = end(maxEnd);
    }
    else if (effectiveRange === "CUSTOM") {
        const cr = customRange || {};
        if (!(cr === null || cr === void 0 ? void 0 : cr.startDate) || !(cr === null || cr === void 0 ? void 0 : cr.endDate)) {
            const err = new Error("customRange.startDate and customRange.endDate are required for CUSTOM");
            err.statusCode = 400;
            throw err;
        }
        if (!isYMD(cr.startDate) || !isYMD(cr.endDate)) {
            const err = new Error("customRange dates must be in YYYY-MM-DD format");
            err.statusCode = 400;
            throw err;
        }
        if (!parseYMDToUTCDate(cr.startDate) || !parseYMDToUTCDate(cr.endDate)) {
            const err = new Error("customRange contains invalid calendar dates");
            err.statusCode = 400;
            throw err;
        }
        endDate = end(cr.endDate);
        startDate = cr.startDate;
        if (endDate < startDate) {
            const err = new Error("customRange.endDate must be <= yesterday and >= startDate");
            err.statusCode = 400;
            throw err;
        }
    }
    else {
        // Defensive fallback
        endDate = maxEnd;
        startDate = shiftYMD(endDate, -27);
    }
    // Ensure we don't query before publish date.
    startDate = clampToPublished(startDate);
    endDate = clampEndDate(startDate, endDate);
    endDate = end(endDate);
    return {
        dateRange: effectiveRange,
        startDate,
        endDate,
        customRange: effectiveRange === "CUSTOM" ? customRange || null : null,
    };
};
const secondsToHMS = (secondsRaw) => {
    const seconds = Number(secondsRaw || 0);
    if (!Number.isFinite(seconds) || seconds <= 0)
        return "00:00:00";
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
};
const safeQuery = (analytics, label, params, limitations) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        return yield analytics.reports.query(params);
    }
    catch (e) {
        limitations.push({
            section: label,
            reason: "YouTube Analytics API query failed",
            details: ((_b = (_a = e === null || e === void 0 ? void 0 : e.errors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) || (e === null || e === void 0 ? void 0 : e.message) || String(e),
        });
        return null;
    }
});
const firstRow = (resp) => {
    var _a;
    const rows = (_a = resp === null || resp === void 0 ? void 0 : resp.data) === null || _a === void 0 ? void 0 : _a.rows;
    return Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])
        ? rows[0]
        : [];
};
const rows = (resp) => {
    var _a;
    const r = (_a = resp === null || resp === void 0 ? void 0 : resp.data) === null || _a === void 0 ? void 0 : _a.rows;
    return Array.isArray(r) ? r : [];
};
const fetchSingleVideoAnalytics = (opts) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const { youtube, analytics, videoId, dateRange, customRange } = opts;
    const limitations = [];
    const videoResp = yield youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails", "status"],
        id: [videoId],
    });
    const item = (videoResp.data.items || [])[0];
    if (!item || !item.id) {
        const err = new Error("Video not found");
        err.statusCode = 404;
        throw err;
    }
    const publishedAt = ((_c = item.snippet) === null || _c === void 0 ? void 0 : _c.publishedAt) || null;
    const publishedAtYMD = publishedAt ? toYMD(new Date(publishedAt)) : null;
    const appliedFilter = resolveVideoDateWindow({
        dateRange,
        customRange,
        publishedAtYMD,
    });
    const { startDate, endDate } = appliedFilter;
    const durationSec = (0, iso_1.isoToSeconds)(((_d = item.contentDetails) === null || _d === void 0 ? void 0 : _d.duration) || undefined);
    const likelyShort = durationSec > 0 && durationSec <= 60;
    const dataStats = item.statistics || {};
    const dataViews = Number(dataStats.viewCount || 0);
    const dataLikes = Number(dataStats.likeCount || 0);
    const dataComments = Number(dataStats.commentCount || 0);
    const dataFav = Number(dataStats.favoriteCount || 0);
    // OVERVIEW
    // First attempt includes engagedViews (may not be enabled for all accounts).
    let overviewResp = yield safeQuery(analytics, "overview", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,engagedViews",
    }, limitations);
    if (!overviewResp) {
        overviewResp = yield safeQuery(analytics, "overview", {
            ids: "channel==MINE",
            startDate,
            endDate,
            filters: `video==${videoId}`,
            metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
        }, limitations);
    }
    const ov = firstRow(overviewResp);
    const ovViews = Number(ov[0] || 0);
    const ovMinutes = Number(ov[1] || 0);
    const ovAvgDurSec = Number(ov[2] || 0);
    const ovAvgPct = ov.length >= 4 ? Number(ov[3] || 0) : 0;
    const ovEngagedViews = ov.length >= 5 ? Number(ov[4] || 0) : null;
    // REACH
    // Impressions-style metrics can be unavailable depending on content type (e.g., Shorts)
    // and channel eligibility. We attempt the query; if unsupported, we keep null.
    let impressions = null;
    let impressionsCtr = null;
    try {
        // Avoid hinting (hardcoding) availability by content type; let API response decide.
        // `likelyShort` is currently unused but may be useful for future feature flags.
        void likelyShort;
        const reachOverviewResp = yield analytics.reports.query({
            ids: "channel==MINE",
            startDate,
            endDate,
            filters: `video==${videoId}`,
            metrics: "impressions,impressionsCtr",
        });
        const reachRow = firstRow(reachOverviewResp);
        impressions = reachRow.length >= 1 ? Number(reachRow[0] || 0) : null;
        impressionsCtr = reachRow.length >= 2 ? Number(reachRow[1] || 0) : null;
    }
    catch (e) {
        limitations.push({
            section: "reach.overview",
            reason: "YouTube Analytics API query failed",
            details: ((_f = (_e = e === null || e === void 0 ? void 0 : e.errors) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.message) || (e === null || e === void 0 ? void 0 : e.message) || String(e),
        });
    }
    // Traffic source types
    const trafficSourcesResp = yield safeQuery(analytics, "reach.trafficSources", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched",
        // Use insight dimension (matches existing working channel-level helper).
        dimensions: "insightTrafficSourceType",
        sort: "-views",
        maxResults: 25,
    }, limitations);
    // Search terms + external sites are "insight" dimensions; YouTube may withhold them
    // for low-volume videos or due to privacy thresholds. We'll try a combined query
    // (type + detail) and split results; fall back to the older per-type queries.
    const insightDetailsResp = yield safeQuery(analytics, "reach.insightDetails", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched",
        dimensions: "insightTrafficSourceType,insightTrafficSourceDetail",
        sort: "-views",
        maxResults: 50,
    }, limitations);
    const insightDetailsRows = rows(insightDetailsResp);
    const hasInsightDetails = insightDetailsRows.length > 0;
    const searchTermsResp = hasInsightDetails
        ? null
        : yield safeQuery(analytics, "reach.searchTerms", {
            ids: "channel==MINE",
            startDate,
            endDate,
            filters: `video==${videoId};insightTrafficSourceType==YT_SEARCH`,
            metrics: "views,estimatedMinutesWatched",
            dimensions: "insightTrafficSourceDetail",
            sort: "-views",
            maxResults: 15,
        }, limitations);
    const externalSitesResp = hasInsightDetails
        ? null
        : yield safeQuery(analytics, "reach.externalSites", {
            ids: "channel==MINE",
            startDate,
            endDate,
            filters: `video==${videoId};insightTrafficSourceType==EXT_URL`,
            metrics: "views,estimatedMinutesWatched",
            dimensions: "insightTrafficSourceDetail",
            sort: "-views",
            maxResults: 15,
        }, limitations);
    // ENGAGEMENT
    const engagementResp = yield safeQuery(analytics, "engagement", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "averageViewPercentage,shares,subscribersGained,subscribersLost,videosAddedToPlaylists,videosRemovedFromPlaylists",
    }, limitations);
    const en = firstRow(engagementResp);
    // AUDIENCE
    const subscribedStatusResp = yield safeQuery(analytics, "audience.subscribedStatus", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched",
        dimensions: "subscribedStatus",
        sort: "-views",
    }, limitations);
    const genderResp = yield safeQuery(analytics, "audience.gender", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "viewerPercentage",
        dimensions: "gender",
        sort: "gender",
    }, limitations);
    const ageResp = yield safeQuery(analytics, "audience.ageGroups", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "viewerPercentage",
        dimensions: "ageGroup",
        sort: "ageGroup",
    }, limitations);
    const countriesResp = yield safeQuery(analytics, "audience.countries", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched",
        dimensions: "country",
        sort: "-views",
        maxResults: 25,
    }, limitations);
    const devicesResp = yield safeQuery(analytics, "audience.devices", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched",
        dimensions: "deviceType",
        sort: "-views",
    }, limitations);
    const osResp = yield safeQuery(analytics, "audience.operatingSystems", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched",
        dimensions: "operatingSystem",
        sort: "-views",
    }, limitations);
    // RETENTION
    const retentionCurveResp = yield safeQuery(analytics, "retention.curve", {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics: "audienceWatchRatio,relativeRetentionPerformance",
        dimensions: "elapsedVideoTimeRatio",
        sort: "elapsedVideoTimeRatio",
    }, limitations);
    // REALTIME (API-limited)
    // Keep empty by default; we don't add a static limitation entry.
    const trafficSources = rows(trafficSourcesResp).map((r) => ({
        source: String(r[0] || ""),
        views: Number(r[1] || 0),
        watchTimeHours: Number(r[2] || 0) / 60,
    }));
    const searchTerms = rows(searchTermsResp).map((r) => ({
        term: String(r[0] || ""),
        views: Number(r[1] || 0),
        watchTimeHours: Number(r[2] || 0) / 60,
    }));
    const externalSites = rows(externalSitesResp).map((r) => ({
        site: String(r[0] || ""),
        views: Number(r[1] || 0),
        watchTimeHours: Number(r[2] || 0) / 60,
    }));
    if (hasInsightDetails) {
        const searchMap = new Map();
        const extMap = new Map();
        for (const r of insightDetailsRows) {
            const type = String(r[0] || "");
            const detail = String(r[1] || "");
            const v = Number(r[2] || 0);
            const minutes = Number(r[3] || 0);
            if (!detail)
                continue;
            if (type === "YT_SEARCH") {
                const prev = searchMap.get(detail);
                searchMap.set(detail, {
                    term: detail,
                    views: ((prev === null || prev === void 0 ? void 0 : prev.views) || 0) + v,
                    minutes: ((prev === null || prev === void 0 ? void 0 : prev.minutes) || 0) + minutes,
                });
            }
            if (type === "EXT_URL") {
                const prev = extMap.get(detail);
                extMap.set(detail, {
                    site: detail,
                    views: ((prev === null || prev === void 0 ? void 0 : prev.views) || 0) + v,
                    minutes: ((prev === null || prev === void 0 ? void 0 : prev.minutes) || 0) + minutes,
                });
            }
        }
        // overwrite the arrays if combined query provided them
        searchTerms.length = 0;
        for (const it of Array.from(searchMap.values()).sort((a, b) => b.views - a.views)) {
            searchTerms.push({
                term: it.term,
                views: it.views,
                watchTimeHours: it.minutes / 60,
            });
        }
        externalSites.length = 0;
        for (const it of Array.from(extMap.values()).sort((a, b) => b.views - a.views)) {
            externalSites.push({
                site: it.site,
                views: it.views,
                watchTimeHours: it.minutes / 60,
            });
        }
    }
    const subscribedStatus = rows(subscribedStatusResp).map((r) => ({
        status: String(r[0] || ""),
        views: Number(r[1] || 0),
        watchTimeHours: Number(r[2] || 0) / 60,
    }));
    const gender = rows(genderResp).map((r) => ({
        gender: String(r[0] || ""),
        viewerPercentage: Number(r[1] || 0),
    }));
    const ageGroups = rows(ageResp).map((r) => ({
        ageGroup: String(r[0] || ""),
        viewerPercentage: Number(r[1] || 0),
    }));
    const countries = rows(countriesResp).map((r) => ({
        country: String(r[0] || ""),
        views: Number(r[1] || 0),
        watchTimeHours: Number(r[2] || 0) / 60,
    }));
    const devices = rows(devicesResp).map((r) => ({
        deviceType: String(r[0] || ""),
        views: Number(r[1] || 0),
        watchTimeHours: Number(r[2] || 0) / 60,
    }));
    const operatingSystems = rows(osResp).map((r) => ({
        os: String(r[0] || ""),
        views: Number(r[1] || 0),
        watchTimeHours: Number(r[2] || 0) / 60,
    }));
    const curve = rows(retentionCurveResp).map((r) => ({
        elapsedVideoTimeRatio: Number(r[0] || 0),
        audienceWatchRatio: r.length >= 2 ? Number(r[1] || 0) : null,
        relativeRetentionPerformance: r.length >= 3 ? Number(r[2] || 0) : null,
    }));
    const viewsByHour = [];
    // Note: we intentionally avoid adding static/hardcoded limitation entries.
    return {
        appliedFilter,
        video: {
            id: item.id,
            title: ((_g = item.snippet) === null || _g === void 0 ? void 0 : _g.title) || null,
            description: ((_h = item.snippet) === null || _h === void 0 ? void 0 : _h.description) || null,
            publishedAt,
            duration: ((_j = item.contentDetails) === null || _j === void 0 ? void 0 : _j.duration) || null,
            thumbnails: ((_k = item.snippet) === null || _k === void 0 ? void 0 : _k.thumbnails) || null,
            channelId: ((_l = item.snippet) === null || _l === void 0 ? void 0 : _l.channelId) || null,
            channelTitle: ((_m = item.snippet) === null || _m === void 0 ? void 0 : _m.channelTitle) || null,
            privacyStatus: ((_o = item.status) === null || _o === void 0 ? void 0 : _o.privacyStatus) || null,
            statistics: {
                viewCount: dataViews,
                likeCount: dataLikes,
                commentCount: dataComments,
                favoriteCount: dataFav,
            },
        },
        overview: {
            views: overviewResp ? ovViews : dataViews,
            watchTimeHours: overviewResp ? ovMinutes / 60 : 0,
            averageViewDuration: overviewResp
                ? secondsToHMS(ovAvgDurSec)
                : "00:00:00",
            likes: dataLikes,
            comments: dataComments,
            engagedViews: overviewResp ? ovEngagedViews : null,
        },
        reach: {
            impressions,
            impressionsCtr,
            trafficSources,
            searchTerms,
            externalSites,
        },
        engagement: {
            averageViewPercentage: engagementResp ? Number(en[0] || 0) : null,
            shares: engagementResp ? Number(en[1] || 0) : null,
            subscribersGained: engagementResp ? Number(en[2] || 0) : null,
            subscribersLost: engagementResp ? Number(en[3] || 0) : null,
            playlistAdds: engagementResp ? Number(en[4] || 0) : null,
            playlistRemoves: engagementResp ? Number(en[5] || 0) : null,
        },
        audience: {
            subscribedStatus,
            gender,
            ageGroups,
            countries,
            devices,
            operatingSystems,
        },
        retention: {
            averageViewDuration: overviewResp
                ? secondsToHMS(ovAvgDurSec)
                : "00:00:00",
            averageViewPercentage: overviewResp ? ovAvgPct : null,
            curve,
        },
        realtime: {
            window: "48h",
            viewsByHour,
        },
        limitations,
    };
});
exports.fetchSingleVideoAnalytics = fetchSingleVideoAnalytics;

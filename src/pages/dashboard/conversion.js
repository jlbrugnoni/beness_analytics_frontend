import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {
    addDays,
    addMonths,
    buildMonthValue,
    ConversionDashboardSection,
    ConversionTrendChart,
    firstQueryValue,
    formatDisplayDate,
    formatMonthLabel,
    formatPeriodTitle,
    formatShortWeekdayDate,
    lastCompletedMonthValue,
    currentMonthValue,
    monthOptions,
    monthParts,
    monthRange,
    previousWeekRange,
    weekRange,
    weekRangeFromDate,
    yearOptions,
} from "@/utils/dashboardHelpers";


// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "beness.dashboard.conversion";
const DEFAULT_MONTHLY_MODE = "last_completed_month";
const DEFAULT_WEEKLY_MODE = "current_week";


// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildDefaultState = () => {
    const defaultWeek = weekRange();
    return {
        mode: "monthly",
        periodMode: DEFAULT_MONTHLY_MODE,
        filters: {
            site: "",
            studio: "",
            month: lastCompletedMonthValue(),
            week_date: defaultWeek.date_from,
            date_from: defaultWeek.date_from,
            date_to: defaultWeek.date_to,
        },
    };
};


const stateFromQuery = (query, fallback) => {
    const mode = firstQueryValue(query.mode);
    const period = firstQueryValue(query.period);
    const validModes = ["monthly", "weekly"];
    const validMonthlyPeriods = ["last_completed_month", "current_month", "specific_month"];
    const validWeeklyPeriods = ["current_week", "previous_week", "specific_week", "range"];
    const resolvedMode = validModes.includes(mode) ? mode : fallback.mode;
    const validPeriods = resolvedMode === "monthly" ? validMonthlyPeriods : validWeeklyPeriods;
    return {
        mode: resolvedMode,
        periodMode: validPeriods.includes(period) ? period : fallback.periodMode,
        filters: {
            site: firstQueryValue(query.site) || fallback.filters.site,
            studio: firstQueryValue(query.studio) || fallback.filters.studio,
            month: firstQueryValue(query.month) || fallback.filters.month,
            week_date: firstQueryValue(query.week_date) || fallback.filters.week_date,
            date_from: firstQueryValue(query.date_from) || fallback.filters.date_from,
            date_to: firstQueryValue(query.date_to) || fallback.filters.date_to,
        },
    };
};


const hasQuery = (query) =>
    ["mode", "site", "studio", "period", "month", "week_date", "date_from", "date_to"].some((key) => firstQueryValue(query?.[key]));


const queryFromState = (mode, periodMode, filters) => {
    const query = {
        mode,
        period: periodMode,
        month: filters.month,
        week_date: filters.week_date,
        date_from: filters.date_from,
        date_to: filters.date_to,
    };
    if (filters.site) query.site = filters.site;
    if (filters.studio) query.studio = filters.studio;
    return query;
};


const sameQuery = (currentQuery, nextQuery) => {
    const current = Object.fromEntries(
        Object.entries(currentQuery || {}).map(([key, value]) => [key, firstQueryValue(value)]),
    );
    const currentKeys = Object.keys(current).filter((key) => current[key] !== undefined && current[key] !== "");
    const nextKeys = Object.keys(nextQuery).filter((key) => nextQuery[key] !== undefined && nextQuery[key] !== "");
    if (currentKeys.length !== nextKeys.length) return false;
    return nextKeys.every((key) => String(current[key] || "") === String(nextQuery[key] || ""));
};


const resolveWeeklyDateRange = (periodMode, filters) => {
    if (periodMode === "current_week") return weekRange();
    if (periodMode === "previous_week") return previousWeekRange();
    if (periodMode === "specific_week") return weekRangeFromDate(filters.week_date);
    return { date_from: filters.date_from, date_to: filters.date_to };
};


// ─── Component ────────────────────────────────────────────────────────────────

export default function ConversionPage() {
    const token = useFetchToken();
    const access = useAccess();
    const router = useRouter();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const canViewMoney = Boolean(access.capabilities?.can_view_money);

    const initialState = useMemo(() => buildDefaultState(), []);

    // Mode / filter / navigation state
    const [mode, setMode] = useState(initialState.mode);
    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [filters, setFilters] = useState(initialState.filters);
    const [periodMode, setPeriodMode] = useState(initialState.periodMode);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [filtersHydrated, setFiltersHydrated] = useState(false);
    const [periodNavigationVersion, setPeriodNavigationVersion] = useState(0);

    // Data state
    const [conversion, setConversion] = useState(null);
    const [comparisonConversion, setComparisonConversion] = useState(null);
    const [conversionTrendData, setConversionTrendData] = useState(null);

    // UI state
    const [expandedInsight, setExpandedInsight] = useState(null);
    const [conversionTrendView, setConversionTrendView] = useState("activity");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    // ─── Derived values ───────────────────────────────────────────────────────

    const activeDateRange = useMemo(() => {
        if (mode === "monthly") {
            if (periodMode === "last_completed_month") return monthRange(lastCompletedMonthValue());
            if (periodMode === "current_month") return monthRange(currentMonthValue());
            if (periodMode === "specific_month") return monthRange(filters.month);
            return monthRange(lastCompletedMonthValue());
        }
        return resolveWeeklyDateRange(periodMode, filters);
    }, [mode, periodMode, filters.month, filters.week_date, filters.date_from, filters.date_to]);

    const activePeriodTitle = formatPeriodTitle(mode === "monthly" ? "monthly" : "weekly", activeDateRange, t);
    const periodLabel = mode === "monthly" ? t("common.month").toLowerCase() : t("common.week");
    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const selectedMonthParts = monthParts(filters.month);

    const conversionTrendRows = mode === "monthly"
        ? (conversionTrendData?.months || []).map((row) => ({
            label: formatMonthLabel(row.month, t),
            trial_bookings: row.trial_bookings || 0,
            attended_trials: row.attended_trials || 0,
            member_conversion_rate: row.member_conversion_rate || 0,
            non_member_conversion_rate: row.non_member_conversion_rate || 0,
        }))
        : (conversionTrendData?.weeks || []).map((row) => ({
            label: formatShortWeekdayDate(row.week_start, t),
            trial_bookings: row.trial_bookings || 0,
            attended_trials: row.attended_trials || 0,
            member_conversion_rate: row.member_conversion_rate || 0,
            non_member_conversion_rate: row.non_member_conversion_rate || 0,
        }));

    // ─── API calls ────────────────────────────────────────────────────────────

    const fetchAllPages = async (endpoint) => {
        let url = `${backendUrl}/api/data/${endpoint}/`;
        let rows = [];
        while (url) {
            const response = await axios.get(url, authHeaders);
            const pageRows = response.data.results || response.data;
            rows = [...rows, ...pageRows];
            url = normalizeApiNextUrl(response.data.next, backendUrl);
        }
        return rows;
    };

    const fetchLookups = async () => {
        if (!token) return;
        const [nextSites, nextStudios] = await Promise.all([
            fetchAllPages("sites"),
            fetchAllPages("studios"),
        ]);
        setSites(nextSites);
        setStudios(nextStudios);
    };

    const fetchDashboard = async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            const requestFilters = {
                site: filters.site,
                studio: filters.studio,
                ...activeDateRange,
            };
            Object.entries(requestFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const queryString = params.toString();

            if (mode === "monthly") {
                const [dashboardResponse, trendResponse] = await Promise.all([
                    axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/?${queryString}`, authHeaders),
                    axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/trends/?${queryString}`, authHeaders),
                ]);
                const dashboardData = dashboardResponse.data;
                setConversion(dashboardData.current.conversion);
                setComparisonConversion(dashboardData.comparison.conversion);
                setConversionTrendData(trendResponse.data);
            } else {
                const dashboardResponse = await axios.get(`${backendUrl}/api/data/analytics/dashboard/weekly/?${queryString}`, authHeaders);
                const dashboardData = dashboardResponse.data;
                setConversion(dashboardData.current.conversion);
                setComparisonConversion(dashboardData.comparison.conversion);
                setConversionTrendData(null);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading conversion data.");
        } finally {
            setLoading(false);
        }
    };

    const openConversionTrend = async (view) => {
        setConversionTrendView(view);
        setExpandedInsight("conversion_trend");
        if (mode === "weekly" && !conversionTrendData) {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    date_from: activeDateRange.date_from,
                    date_to: activeDateRange.date_to,
                });
                if (filters.site) params.set("site", filters.site);
                if (filters.studio) params.set("studio", filters.studio);
                const response = await axios.get(
                    `${backendUrl}/api/data/analytics/dashboard/weekly/trends/?${params.toString()}`,
                    authHeaders,
                );
                setConversionTrendData(response.data);
            } catch (err) {
                setError(err.response?.data?.detail || "Error loading conversion trend.");
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    // ─── Hydration ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!router.isReady) return;
        let nextState = initialState;
        if (hasQuery(router.query)) {
            nextState = stateFromQuery(router.query, initialState);
        } else if (typeof window !== "undefined") {
            try {
                const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
                if (stored) {
                    nextState = {
                        mode: stored.mode || initialState.mode,
                        periodMode: stored.periodMode || initialState.periodMode,
                        filters: { ...initialState.filters, ...(stored.filters || {}) },
                    };
                }
            } catch {
                nextState = initialState;
            }
        }
        setMode(nextState.mode);
        setPeriodMode(nextState.periodMode);
        setFilters(nextState.filters);
        setFiltersHydrated(true);
    }, [router.isReady]);

    useEffect(() => {
        if (!filtersHydrated || !router.isReady) return;
        const state = { mode, periodMode, filters };
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        const nextQuery = queryFromState(mode, periodMode, filters);
        if (!sameQuery(router.query, nextQuery)) {
            router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
        }
    }, [filtersHydrated, router.isReady, mode, periodMode, filters]);

    useEffect(() => {
        if (!filtersHydrated) return;
        fetchDashboard();
    }, [token, periodNavigationVersion, filtersHydrated]);

    // Reset trend data and refetch when mode changes
    useEffect(() => {
        if (!filtersHydrated) return;
        setConversionTrendData(null);
        setConversion(null);
        setComparisonConversion(null);
        // Reset period mode to defaults for the new mode
        if (mode === "monthly") {
            setPeriodMode(DEFAULT_MONTHLY_MODE);
        } else {
            setPeriodMode(DEFAULT_WEEKLY_MODE);
        }
        setPeriodNavigationVersion((v) => v + 1);
    }, [mode]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleSiteChange = (event) => {
        setFilters({ ...filters, site: event.target.value, studio: "" });
        setPeriodNavigationVersion((v) => v + 1);
    };

    const handleStudioChange = (event) => {
        setFilters({ ...filters, studio: event.target.value });
        setPeriodNavigationVersion((v) => v + 1);
    };

    const handlePeriodModeChange = (event) => {
        setPeriodMode(event.target.value);
    };

    const navigatePeriod = (direction) => {
        if (mode === "monthly") {
            const activeMonth = activeDateRange.date_from.slice(0, 7);
            const nextMonth = addMonths(activeMonth, direction);
            setPeriodMode("specific_month");
            setFilters({ ...filters, month: nextMonth });
        } else {
            const nextWeekDate = addDays(activeDateRange.date_from, direction * 7);
            const nextWeekRange = weekRangeFromDate(nextWeekDate);
            setPeriodMode("specific_week");
            setFilters({
                ...filters,
                week_date: nextWeekRange.date_from,
                date_from: nextWeekRange.date_from,
                date_to: nextWeekRange.date_to,
            });
        }
        setPeriodNavigationVersion((v) => v + 1);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Conversion</title>
            </Head>
            <div className={styles.container}>
                <div style={{ width: "100%", display: "grid", gap: "16px" }}>
                    {/* Back button */}
                    <Stack direction="row" alignItems="center" spacing={1} style={{ marginBottom: "4px" }}>
                        <IconButton size="small" onClick={() => router.push("/dashboard")}>
                            <ArrowBackIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">Dashboard</Typography>
                    </Stack>

                    {/* Mode toggle */}
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="body2" color="text.secondary">View:</Typography>
                        <Tabs
                            value={mode}
                            onChange={(_, value) => setMode(value)}
                            variant="standard"
                        >
                            <Tab label="Monthly" value="monthly" />
                            <Tab label="Weekly" value="weekly" />
                        </Tabs>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    {/* Sticky toolbar */}
                    <Paper
                        elevation={2}
                        style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 10,
                            padding: "8px 12px",
                            display: "grid",
                            gap: "8px",
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" style={{ borderBottom: "1px solid #f0f0f0", padding: "6px 0" }}>
                            <Tooltip title={mode === "monthly" ? t("dashboard.previousMonth") : t("dashboard.previousWeek")}>
                                <span>
                                    <IconButton onClick={() => navigatePeriod(-1)} disabled={loading}>
                                        <ChevronLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <div style={{ minWidth: "220px", textAlign: "center" }}>
                                <div style={{ fontSize: "17px", fontWeight: 700, lineHeight: 1.3 }}>{activePeriodTitle}</div>
                                <div style={{ color: "#666", fontSize: "12px" }}>
                                    {formatDisplayDate(activeDateRange.date_from, t)} - {formatDisplayDate(activeDateRange.date_to, t)}
                                </div>
                            </div>
                            <Tooltip title={mode === "monthly" ? t("dashboard.nextMonth") : t("dashboard.nextWeek")}>
                                <span>
                                    <IconButton onClick={() => navigatePeriod(1)} disabled={loading}>
                                        <ChevronRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                            <TextField
                                select
                                label={t("common.site")}
                                size="small"
                                value={filters.site}
                                onChange={handleSiteChange}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">{t("dashboard.allSites")}</MenuItem>
                                {sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label={t("common.studio")}
                                size="small"
                                value={filters.studio}
                                onChange={handleStudioChange}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">{t("dashboard.allStudios")}</MenuItem>
                                {visibleStudios.map((studio) => (
                                    <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>
                                ))}
                            </TextField>
                            <Button variant="outlined" onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}>
                                {advancedFiltersOpen ? t("common.hideAdvanced") : t("common.advanced")}
                            </Button>
                        </Stack>
                        {advancedFiltersOpen && (
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", borderTop: "1px solid #f0f0f0", paddingTop: "8px" }}>
                                {mode === "monthly" ? (
                                    <>
                                        <TextField
                                            select
                                            label={t("common.period")}
                                            value={periodMode}
                                            onChange={handlePeriodModeChange}
                                        >
                                            <MenuItem value="last_completed_month">{t("dashboard.period.lastCompletedMonth")}</MenuItem>
                                            <MenuItem value="current_month">{t("dashboard.period.currentMonth")}</MenuItem>
                                            <MenuItem value="specific_month">{t("dashboard.period.specificMonth")}</MenuItem>
                                        </TextField>
                                        {periodMode === "specific_month" && (
                                            <>
                                                <TextField
                                                    select
                                                    label={t("common.month")}
                                                    value={selectedMonthParts.month}
                                                    onChange={(event) => setFilters({
                                                        ...filters,
                                                        month: buildMonthValue(selectedMonthParts.year, event.target.value),
                                                    })}
                                                >
                                                    {monthOptions.map((month) => (
                                                        <MenuItem key={month.value} value={month.value}>{t(month.labelKey)}</MenuItem>
                                                    ))}
                                                </TextField>
                                                <TextField
                                                    select
                                                    label={t("common.year")}
                                                    value={Number(selectedMonthParts.year)}
                                                    onChange={(event) => setFilters({
                                                        ...filters,
                                                        month: buildMonthValue(event.target.value, selectedMonthParts.month),
                                                    })}
                                                >
                                                    {yearOptions().map((year) => (
                                                        <MenuItem key={year} value={year}>{year}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <TextField
                                            select
                                            label={t("common.period")}
                                            value={periodMode}
                                            onChange={handlePeriodModeChange}
                                        >
                                            <MenuItem value="current_week">{t("dashboard.period.currentWeek")}</MenuItem>
                                            <MenuItem value="previous_week">{t("dashboard.period.previousWeek")}</MenuItem>
                                            <MenuItem value="specific_week">{t("dashboard.period.specificWeek")}</MenuItem>
                                            <MenuItem value="range">{t("dashboard.period.customRange")}</MenuItem>
                                        </TextField>
                                        {periodMode === "specific_week" && (
                                            <TextField
                                                label={t("common.weekOf")}
                                                type="date"
                                                value={filters.week_date}
                                                InputLabelProps={{ shrink: true }}
                                                onChange={(event) => setFilters({ ...filters, week_date: event.target.value })}
                                            />
                                        )}
                                        {periodMode === "range" && (
                                            <>
                                                <TextField
                                                    label={t("common.dateFrom")}
                                                    type="date"
                                                    value={filters.date_from}
                                                    InputLabelProps={{ shrink: true }}
                                                    onChange={(event) => setFilters({ ...filters, date_from: event.target.value })}
                                                />
                                                <TextField
                                                    label={t("common.dateTo")}
                                                    type="date"
                                                    value={filters.date_to}
                                                    InputLabelProps={{ shrink: true }}
                                                    onChange={(event) => setFilters({ ...filters, date_to: event.target.value })}
                                                />
                                            </>
                                        )}
                                    </>
                                )}
                                <Button variant="contained" onClick={fetchDashboard} disabled={loading}>
                                    {loading ? t("common.loading") : t("common.apply")}
                                </Button>
                            </div>
                        )}
                        {loading && <LinearProgress />}
                    </Paper>

                    {/* ── Conversion content ─────────────────────────────────── */}
                    <ConversionDashboardSection
                        conversion={conversion}
                        comparisonConversion={comparisonConversion}
                        periodLabel={periodLabel}
                        mode={mode}
                        onOpenTrend={openConversionTrend}
                        t={t}
                    />
                </div>
            </div>

            {/* ── Dialogs ────────────────────────────────────────────────────── */}

            <Dialog open={expandedInsight === "conversion_trend"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="lg">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.trialConversionTrend")}</span>
                        <IconButton aria-label="Close trial conversion trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={conversionTrendView}
                        onChange={(_, value) => setConversionTrendView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label={t("dashboard.kpi.trialVisits")} value="activity" />
                        <Tab label={t("common.conversion")} value="rates" />
                    </Tabs>
                    {loading ? (
                        <LinearProgress />
                    ) : (
                        <ConversionTrendChart rows={conversionTrendRows} view={conversionTrendView} t={t} />
                    )}
                </DialogContent>
            </Dialog>
        </MainPage>
    );
}

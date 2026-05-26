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
    CapacityUsageCard,
    firstQueryValue,
    formatDisplayDate,
    formatPeriodTitle,
    formatShortWeekdayDate,
    OccupancyCapacityByDayChart,
    OccupancyHourMatrix,
    OccupancySlotTable,
    OccupationTable,
    previousWeekRange,
    weekdayNameKeyLookup,
    weekdayNames,
    WeeklyOccupancyComparisonChart,
    WeeklyOccupancyHealthTrendChart,
    WeeklyWeekdayDrilldownChart,
    weeklyComparisonRows,
    weekRange,
    weekRangeFromDate,
} from "@/utils/dashboardHelpers";


// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "beness.dashboard.occupancy";
const DEFAULT_PERIOD_MODE = "current_week";


// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildDefaultState = () => {
    const defaultWeek = weekRange();
    return {
        periodMode: DEFAULT_PERIOD_MODE,
        filters: {
            site: "",
            studio: "",
            week_date: defaultWeek.date_from,
            date_from: defaultWeek.date_from,
            date_to: defaultWeek.date_to,
        },
    };
};


const stateFromQuery = (query, fallback) => {
    const period = firstQueryValue(query.period);
    const validPeriods = ["current_week", "previous_week", "specific_week", "range"];
    return {
        periodMode: validPeriods.includes(period) ? period : fallback.periodMode,
        filters: {
            site: firstQueryValue(query.site) || fallback.filters.site,
            studio: firstQueryValue(query.studio) || fallback.filters.studio,
            week_date: firstQueryValue(query.week_date) || fallback.filters.week_date,
            date_from: firstQueryValue(query.date_from) || fallback.filters.date_from,
            date_to: firstQueryValue(query.date_to) || fallback.filters.date_to,
        },
    };
};


const hasQuery = (query) =>
    ["site", "studio", "period", "week_date", "date_from", "date_to"].some((key) => firstQueryValue(query?.[key]));


const queryFromState = (periodMode, filters) => {
    const query = {
        period: periodMode,
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


const resolveActiveDateRange = (periodMode, filters) => {
    if (periodMode === "current_week") return weekRange();
    if (periodMode === "previous_week") return previousWeekRange();
    if (periodMode === "specific_week") return weekRangeFromDate(filters.week_date);
    return { date_from: filters.date_from, date_to: filters.date_to };
};


// ─── Component ────────────────────────────────────────────────────────────────

export default function OccupancyPage() {
    const token = useFetchToken();
    const access = useAccess();
    const router = useRouter();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const canViewMoney = Boolean(access.capabilities?.can_view_money);

    const initialState = useMemo(() => buildDefaultState(), []);

    // Filter / navigation state
    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [filters, setFilters] = useState(initialState.filters);
    const [periodMode, setPeriodMode] = useState(initialState.periodMode);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [filtersHydrated, setFiltersHydrated] = useState(false);
    const [periodNavigationVersion, setPeriodNavigationVersion] = useState(0);

    // Data state
    const [occupation, setOccupation] = useState(null);
    const [comparisonOccupation, setComparisonOccupation] = useState(null);

    // UI state
    const [expandedInsight, setExpandedInsight] = useState(null);
    const [weeklyTrends, setWeeklyTrends] = useState(null);
    const [weeklyTrendsLoading, setWeeklyTrendsLoading] = useState(false);
    const [weeklyOccupancyTrendView, setWeeklyOccupancyTrendView] = useState("capacity");
    const [occupancyHourMatrix, setOccupancyHourMatrix] = useState(null);
    const [occupancyHourMatrixLoading, setOccupancyHourMatrixLoading] = useState(false);
    const [occupancyHourMatrixView, setOccupancyHourMatrixView] = useState("current_week");
    const [weeklyDrilldownWeekday, setWeeklyDrilldownWeekday] = useState("Monday");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    // ─── Derived values ───────────────────────────────────────────────────────

    const activeDateRange = useMemo(
        () => resolveActiveDateRange(periodMode, filters),
        [periodMode, filters.week_date, filters.date_from, filters.date_to],
    );

    const activePeriodTitle = formatPeriodTitle("weekly", activeDateRange, t);
    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;

    const occupancySlots = occupation?.by_slot || [];
    const lowOccupancySlots = [...occupancySlots]
        .filter((row) => Number(row.capacity || 0) > 0)
        .sort((a, b) => Number(a.occupation_rate || 0) - Number(b.occupation_rate || 0))
        .slice(0, 10);
    const highOccupancySlots = [...occupancySlots]
        .filter((row) => Number(row.capacity || 0) > 0)
        .sort((a, b) => Number(b.occupation_rate || 0) - Number(a.occupation_rate || 0))
        .slice(0, 10);

    const weeklyTrendRows = (weeklyTrends?.weeks || []).map((row) => ({
        label: formatShortWeekdayDate(row.week_start, t),
        total_bookings: row.total_bookings || 0,
        completed_visits: row.completed_visits || 0,
        no_show_rate: row.no_show_rate || 0,
        late_cancel_rate: row.late_cancel_rate || 0,
        average_revenue_per_attended_visit: row.average_revenue_per_attended_visit || 0,
        occupation_rate: row.occupation_rate || 0,
        scheduled_capacity: row.scheduled_capacity || 0,
        attendance_used: row.attendance_used || 0,
        unused_capacity: Math.max(0, Number(row.scheduled_capacity || 0) - Number(row.attendance_used || 0)),
        scheduled_classes: row.scheduled_classes || 0,
    }));

    const weeklyWeekdayDrilldownRows = (weeklyTrends?.weekday_rows || [])
        .filter((row) => row.weekday === weeklyDrilldownWeekday)
        .map((row) => ({
            label: formatShortWeekdayDate(row.date, t),
            total_bookings: row.total_bookings || 0,
            completed_visits: row.completed_visits || 0,
            no_shows: row.no_shows || 0,
            late_cancels: row.late_cancels || 0,
            scheduled_capacity: row.scheduled_capacity || 0,
            attendance_used: row.attendance_used || 0,
            unused_capacity: Math.max(0, Number(row.scheduled_capacity || 0) - Number(row.attendance_used || 0)),
            occupation_rate: row.occupation_rate || 0,
        }));

    const weeklyOccupancyComparisonRows = weeklyComparisonRows(
        activeDateRange,
        occupation?.by_day,
        comparisonOccupation?.by_day,
        "occupation_rate",
        t,
    );

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

            const dashboardResponse = await axios.get(`${backendUrl}/api/data/analytics/dashboard/weekly/?${queryString}`, authHeaders);
            const dashboardData = dashboardResponse.data;
            setOccupation(dashboardData.current.occupation);
            setComparisonOccupation(dashboardData.comparison.occupation);
            setWeeklyTrends(null);
            setOccupancyHourMatrix(null);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading occupancy data.");
        } finally {
            setLoading(false);
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
                        periodMode: stored.periodMode || initialState.periodMode,
                        filters: { ...initialState.filters, ...(stored.filters || {}) },
                    };
                }
            } catch {
                nextState = initialState;
            }
        }
        setPeriodMode(nextState.periodMode);
        setFilters(nextState.filters);
        setFiltersHydrated(true);
    }, [router.isReady]);

    useEffect(() => {
        if (!filtersHydrated || !router.isReady) return;
        const state = { periodMode, filters };
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        const nextQuery = queryFromState(periodMode, filters);
        if (!sameQuery(router.query, nextQuery)) {
            router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
        }
    }, [filtersHydrated, router.isReady, periodMode, filters]);

    useEffect(() => {
        if (!filtersHydrated) return;
        fetchDashboard();
    }, [token, periodNavigationVersion, filtersHydrated]);

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
        const nextWeekDate = addDays(activeDateRange.date_from, direction * 7);
        const nextWeekRange = weekRangeFromDate(nextWeekDate);
        setPeriodMode("specific_week");
        setFilters({
            ...filters,
            week_date: nextWeekRange.date_from,
            date_from: nextWeekRange.date_from,
            date_to: nextWeekRange.date_to,
        });
        setPeriodNavigationVersion((v) => v + 1);
    };

    const openWeeklyTrend = async (insightKey) => {
        setExpandedInsight(insightKey);
        if (weeklyTrends) return;
        setWeeklyTrendsLoading(true);
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
            setWeeklyTrends(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading weekly trend.");
        } finally {
            setWeeklyTrendsLoading(false);
        }
    };

    const openOccupancyHourMatrix = async () => {
        setExpandedInsight("occupancy_hour_matrix");
        if (occupancyHourMatrix) return;
        setOccupancyHourMatrixLoading(true);
        try {
            const params = new URLSearchParams({
                date_from: activeDateRange.date_from,
                date_to: activeDateRange.date_to,
                weeks: "6",
            });
            if (filters.site) params.set("site", filters.site);
            if (filters.studio) params.set("studio", filters.studio);
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/dashboard/weekly/occupancy-hour-matrix/?${params.toString()}`,
                authHeaders,
            );
            setOccupancyHourMatrix(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading occupancy matrix.");
        } finally {
            setOccupancyHourMatrixLoading(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Occupancy</title>
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
                            <Tooltip title={t("dashboard.previousWeek")}>
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
                            <Tooltip title={t("dashboard.nextWeek")}>
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
                                <Button variant="contained" onClick={fetchDashboard} disabled={loading}>
                                    {loading ? t("common.loading") : t("common.apply")}
                                </Button>
                            </div>
                        )}
                        {loading && <LinearProgress />}
                    </Paper>

                    {/* ── Occupancy content ──────────────────────────────────── */}
                    <CapacityUsageCard
                        occupation={occupation}
                        t={t}
                        action={(
                            <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_occupancy_health")}>
                                {t("common.trend")}
                            </Button>
                        )}
                    />
                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                        <OccupancyCapacityByDayChart
                            rows={occupation?.by_day}
                            t={t}
                            action={(
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_occupancy_weekday")}>
                                        Weekday Detail
                                    </Button>
                                    <Button variant="outlined" size="small" onClick={openOccupancyHourMatrix}>
                                        Hour Matrix
                                    </Button>
                                </Stack>
                            )}
                        />
                        <WeeklyOccupancyComparisonChart rows={weeklyOccupancyComparisonRows} t={t} />
                    </div>

                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                        <OccupationTable title={t("dashboard.tables.occupancyByRoom")} rows={occupation?.by_room_capacity} t={t} />
                        <OccupancySlotTable title={t("dashboard.tables.lowestOccupancySlots")} rows={lowOccupancySlots} t={t} />
                        <OccupancySlotTable title={t("dashboard.tables.highestOccupancySlots")} rows={highOccupancySlots} t={t} />
                    </div>
                </div>
            </div>

            {/* ── Dialogs ────────────────────────────────────────────────────── */}

            <Dialog open={expandedInsight === "weekly_occupancy_health"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="lg">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.occupancyHealthTrend")}</span>
                        <IconButton aria-label="Close occupancy health trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={weeklyOccupancyTrendView}
                        onChange={(_, value) => setWeeklyOccupancyTrendView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label={t("dashboard.cards.capacityUsed")} value="capacity" />
                        <Tab label={t("common.occupancy")} value="rate" />
                        <Tab label={t("dashboard.kpi.scheduledClasses")} value="classes" />
                    </Tabs>
                    {weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <WeeklyOccupancyHealthTrendChart rows={weeklyTrendRows} view={weeklyOccupancyTrendView} t={t} />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={expandedInsight === "weekly_occupancy_weekday"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="lg">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.occupancyByWeekday")}</span>
                        <IconButton aria-label="Close occupancy weekday detail" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={weeklyDrilldownWeekday}
                        onChange={(_, value) => setWeeklyDrilldownWeekday(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        {weekdayNames.map((weekday) => (
                            <Tab key={weekday} label={t(`weekdays.${weekdayNameKeyLookup[weekday]}`)} value={weekday} />
                        ))}
                    </Tabs>
                    {weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <WeeklyWeekdayDrilldownChart rows={weeklyWeekdayDrilldownRows} metric="occupancy" t={t} />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={expandedInsight === "occupancy_hour_matrix"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="xl">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.occupancyByHourMatrix")}</span>
                        <IconButton aria-label="Close occupancy hour matrix" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={occupancyHourMatrixView}
                        onChange={(_, value) => setOccupancyHourMatrixView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label={t("dashboard.period.currentWeek")} value="current_week" />
                        <Tab label={t("dashboard.modal.occupancyByWeekday")} value="history" />
                    </Tabs>
                    {occupancyHourMatrixView === "history" && (
                        <Tabs
                            value={weeklyDrilldownWeekday}
                            onChange={(_, value) => setWeeklyDrilldownWeekday(value)}
                            variant="scrollable"
                            scrollButtons="auto"
                            style={{ marginBottom: "16px" }}
                        >
                            {weekdayNames.map((weekday) => (
                                <Tab key={weekday} label={t(`weekdays.${weekdayNameKeyLookup[weekday]}`)} value={weekday} />
                            ))}
                        </Tabs>
                    )}
                    {occupancyHourMatrixLoading ? (
                        <LinearProgress />
                    ) : (
                        <OccupancyHourMatrix
                            data={occupancyHourMatrix}
                            view={occupancyHourMatrixView}
                            weekday={weeklyDrilldownWeekday}
                            t={t}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </MainPage>
    );
}

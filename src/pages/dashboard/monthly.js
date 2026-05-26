import Head from "next/head";
import Link from "next/link";
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
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {
    addMonths,
    buildMonthValue,
    comparisonDelta,
    firstQueryValue,
    formatDisplayDate,
    formatMoney,
    formatMonthLabel,
    formatNumber,
    formatPercent,
    formatPeriodTitle,
    lastCompletedMonthValue,
    currentMonthValue,
    InsightCard,
    RetentionHealthTrendChart,
    RevenueHealthTrendChart,
    monthOptions,
    monthParts,
    monthRange,
    yearOptions,
} from "@/utils/dashboardHelpers";


// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "beness.dashboard.monthly";
const DEFAULT_PERIOD_MODE = "last_completed_month";


// ─── Helper: build initial state ──────────────────────────────────────────────

const buildDefaultState = () => ({
    periodMode: DEFAULT_PERIOD_MODE,
    filters: {
        site: "",
        studio: "",
        month: lastCompletedMonthValue(),
    },
});


const stateFromQuery = (query, fallback) => {
    const period = firstQueryValue(query.period);
    const validPeriods = ["last_completed_month", "current_month", "specific_month"];
    return {
        periodMode: validPeriods.includes(period) ? period : fallback.periodMode,
        filters: {
            site: firstQueryValue(query.site) || fallback.filters.site,
            studio: firstQueryValue(query.studio) || fallback.filters.studio,
            month: firstQueryValue(query.month) || fallback.filters.month,
        },
    };
};


const hasMonthlyQuery = (query) =>
    ["site", "studio", "period", "month"].some((key) => firstQueryValue(query?.[key]));


const queryFromState = (periodMode, filters) => {
    const query = { period: periodMode, month: filters.month };
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


// ─── Component ────────────────────────────────────────────────────────────────

export default function MonthlySummaryPage() {
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
    const [summary, setSummary] = useState(null);
    const [retention, setRetention] = useState(null);
    const [retentionTrend, setRetentionTrend] = useState(null);
    const [comparisonSummary, setComparisonSummary] = useState(null);
    const [comparisonRetention, setComparisonRetention] = useState(null);

    // UI state
    const [expandedInsight, setExpandedInsight] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    // ─── Derived values ───────────────────────────────────────────────────────

    const activeDateRange = useMemo(() => {
        if (periodMode === "last_completed_month") return monthRange(lastCompletedMonthValue());
        if (periodMode === "current_month") return monthRange(currentMonthValue());
        if (periodMode === "specific_month") return monthRange(filters.month);
        return monthRange(lastCompletedMonthValue());
    }, [periodMode, filters.month]);

    const activePeriodTitle = formatPeriodTitle("monthly", activeDateRange, t);
    const periodLabel = t("common.month").toLowerCase();
    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const selectedMonthParts = monthParts(filters.month);
    const totals = summary?.totals || {};
    const comparisonTotals = comparisonSummary?.totals || {};

    const revenueTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month, t),
        sales_revenue: row.sales_revenue || 0,
        average_ticket: row.average_ticket || 0,
    }));

    const retentionHealthTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month, t),
        renewal_rate: row.renewal_rate || 0,
        not_renewed_members: row.not_renewed_members || 0,
        not_renewed_unassigned_studio: row.not_renewed_unassigned_studio || 0,
    }));

    // ─── Guard: hide revenue dialog when access removed ───────────────────────

    useEffect(() => {
        if (!canViewMoney && expandedInsight === "revenue_health") {
            setExpandedInsight(null);
        }
    }, [canViewMoney, expandedInsight]);

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

            const [dashboardResponse, trendResponse] = await Promise.all([
                axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/trends/?${queryString}`, authHeaders),
            ]);
            const dashboardData = dashboardResponse.data;
            setSummary(dashboardData.current.summary);
            setRetention(dashboardData.current.retention);
            setComparisonSummary(dashboardData.comparison.summary);
            setComparisonRetention(dashboardData.comparison.retention);
            setRetentionTrend(trendResponse.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    // ─── Hydration: URL params → localStorage → defaults ─────────────────────

    useEffect(() => {
        if (!router.isReady) return;
        let nextState = initialState;
        if (hasMonthlyQuery(router.query)) {
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

    // ─── Persist state to localStorage + URL ─────────────────────────────────

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

    // ─── Fetch on period / filter change ─────────────────────────────────────

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
        const activeMonth = activeDateRange.date_from.slice(0, 7);
        const nextMonth = addMonths(activeMonth, direction);
        setPeriodMode("specific_month");
        setFilters({ ...filters, month: nextMonth });
        setPeriodNavigationVersion((v) => v + 1);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Monthly Summary</title>
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
                            <Tooltip title={t("dashboard.previousMonth")}>
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
                            <Tooltip title={t("dashboard.nextMonth")}>
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
                                <Button variant="contained" onClick={fetchDashboard} disabled={loading}>
                                    {loading ? t("common.loading") : t("common.apply")}
                                </Button>
                            </div>
                        )}
                        {loading && <LinearProgress />}
                    </Paper>

                    {/* ── Monthly Summary content ─────────────────────────────── */}
                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                        {canViewMoney && (
                            <InsightCard
                                title={t("dashboard.cards.revenueHealth")}
                                value={formatMoney(totals.sales_revenue)}
                                delta={comparisonDelta(totals.sales_revenue, comparisonTotals.sales_revenue, {
                                    periodLabel,
                                    decimals: 2,
                                    money: true,
                                    previousLabel: `vs ${t("common.previousPeriod")}`,
                                })}
                                caption="Sales revenue for the selected month."
                                details={[
                                    { label: t("dashboard.kpi.visitRevenue"), value: formatMoney(totals.visit_revenue) },
                                    { label: t("dashboard.kpi.averageTicket"), value: formatMoney(totals.average_ticket) },
                                ]}
                                action={(
                                    <Button variant="outlined" size="small" onClick={() => setExpandedInsight("revenue_health")}>
                                        {t("common.trend")}
                                    </Button>
                                )}
                            />
                        )}
                        <InsightCard
                            title={t("dashboard.cards.retentionHealth")}
                            value={formatPercent(retention?.renewal_rate)}
                            delta={comparisonDelta(retention?.renewal_rate, comparisonRetention?.renewal_rate, {
                                periodLabel,
                                decimals: 2,
                                suffix: " pts",
                                previousLabel: `vs ${t("common.previousPeriod")}`,
                            })}
                            caption="Renewal rate from monthly membership snapshots."
                            details={[
                                { label: "Churn rate", value: formatPercent(retention?.churn_rate) },
                                { label: t("dashboard.kpi.retainedMembers"), value: formatNumber(retention?.retained_members) },
                                { label: t("dashboard.kpi.currentMembers"), value: formatNumber(retention?.current_month_members) },
                                { label: t("dashboard.kpi.unassignedNotRenewed"), value: formatNumber(retention?.not_renewed_unassigned_studio) },
                            ]}
                            action={(
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button variant="outlined" size="small" onClick={() => setExpandedInsight("retention_health")}>
                                        {t("common.trend")}
                                    </Button>
                                    <Link href="/retention">
                                        <Button variant="outlined" size="small">Open Follow-up</Button>
                                    </Link>
                                </Stack>
                            )}
                        />
                        <InsightCard
                            title={t("dashboard.cards.followUpFocus")}
                            value={formatNumber(retention?.not_renewed_members ?? retention?.not_renewed_services)}
                            delta={comparisonDelta(
                                retention?.not_renewed_members ?? retention?.not_renewed_services,
                                comparisonRetention?.not_renewed_members ?? comparisonRetention?.not_renewed_services,
                                { periodLabel, invertTone: true, previousLabel: `vs ${t("common.previousPeriod")}` },
                            )}
                            caption="Members who did not renew in the selected month."
                            details={[
                                ...(canViewMoney ? [{ label: t("dashboard.kpi.valueAtRisk"), value: formatMoney(retention?.not_renewed_value) }] : []),
                                { label: "Attending unpaid", value: formatNumber(retention?.not_renewed_attending_unpaid) },
                                { label: "Attending paid", value: formatNumber(retention?.not_renewed_attending_paid) },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* ── Dialogs ────────────────────────────────────────────────────── */}

            <Dialog open={expandedInsight === "revenue_health"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="lg">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.revenueHealthTrend")}</span>
                        <IconButton aria-label="Close revenue trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <RevenueHealthTrendChart rows={revenueTrendRows} t={t} />
                </DialogContent>
            </Dialog>

            <Dialog open={expandedInsight === "retention_health"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="lg">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.retentionHealthTrend")}</span>
                        <IconButton aria-label="Close retention trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <RetentionHealthTrendChart rows={retentionHealthTrendRows} t={t} />
                </DialogContent>
            </Dialog>
        </MainPage>
    );
}

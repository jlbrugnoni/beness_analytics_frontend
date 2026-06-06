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
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
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
    MemberMixHistoryChart,
    MemberTrendChart,
    RetentionDetailTable,
    RetentionHealthTrendChart,
    RetentionSummaryTableCard,
    monthOptions,
    monthParts,
    monthRange,
    yearOptions,
} from "@/utils/dashboardHelpers";


// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "beness.dashboard.retention";
const DEFAULT_PERIOD_MODE = "last_completed_month";


// ─── Helpers ──────────────────────────────────────────────────────────────────

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


const hasQuery = (query) =>
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

export default function RetentionPage() {
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
    const [retention, setRetention] = useState(null);
    const [retentionTrend, setRetentionTrend] = useState(null);
    const [comparisonRetention, setComparisonRetention] = useState(null);

    // UI state
    const [expandedInsight, setExpandedInsight] = useState(null);
    const [memberMixTrendView, setMemberMixTrendView] = useState("members");
    const [retentionTables, setRetentionTables] = useState(null);
    const [retentionTablesLoading, setRetentionTablesLoading] = useState(false);
    const [activeRetentionTable, setActiveRetentionTable] = useState("not_renewed");
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

    const retentionFollowUpHref = {
        pathname: "/retention",
        query: {
            period: "range",
            date_from: activeDateRange.date_from,
            date_to: activeDateRange.date_to,
            status: "not_renewed",
            ...(filters.site ? { site: filters.site } : {}),
            ...(filters.studio ? { studio: filters.studio } : {}),
        },
    };

    const retentionTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month, t),
        current_members: row.current_members || 0,
        not_renewed: row.not_renewed_members || 0,
    }));

    const retentionHealthTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month, t),
        renewal_rate: row.renewal_rate || 0,
        not_renewed_members: row.not_renewed_members || 0,
        not_renewed_unassigned_studio: row.not_renewed_unassigned_studio || 0,
    }));

    const memberMixTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month, t),
        current_members: row.current_members || 0,
        current_member_mix: row.current_member_mix || [],
        retained_members: row.retained_members || 0,
        new_members: row.new_members || 0,
        reactivated_members: row.reactivated_members || 0,
        not_renewed_members: row.not_renewed_members || 0,
        renewal_rate: row.renewal_rate || 0,
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

            const [dashboardResponse, trendResponse] = await Promise.all([
                axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/trends/?${queryString}`, authHeaders),
            ]);
            const dashboardData = dashboardResponse.data;
            setRetention(dashboardData.current.retention);
            setComparisonRetention(dashboardData.comparison.retention);
            setRetentionTrend(trendResponse.data);
            setRetentionTables(null);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading retention data.");
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
        const activeMonth = activeDateRange.date_from.slice(0, 7);
        const nextMonth = addMonths(activeMonth, direction);
        setPeriodMode("specific_month");
        setFilters({ ...filters, month: nextMonth });
        setPeriodNavigationVersion((v) => v + 1);
    };

    const openRetentionTable = async (tableKey) => {
        setActiveRetentionTable(tableKey);
        setExpandedInsight("retention_tables");
        if (retentionTables) return;
        setRetentionTablesLoading(true);
        try {
            const params = new URLSearchParams({
                date_from: activeDateRange.date_from,
                date_to: activeDateRange.date_to,
                limit: "500",
            });
            if (filters.site) params.set("site", filters.site);
            if (filters.studio) params.set("studio", filters.studio);
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/dashboard/monthly/retention-tables/?${params.toString()}`,
                authHeaders,
            );
            setRetentionTables(response.data.tables);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading retention table.");
        } finally {
            setRetentionTablesLoading(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Retention</title>
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

                    {/* ── Retention content ──────────────────────────────────── */}
                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                        <InsightCard
                            title={t("dashboard.cards.currentMemberMix")}
                            value={formatNumber(retention?.current_month_members)}
                            caption={t("dashboard.caption.memberMix")}
                            details={[
                                { label: t("dashboard.kpi.renewalRate"), value: formatPercent(retention?.renewal_rate) },
                                { label: t("dashboard.kpi.retained"), value: formatNumber(retention?.retained_members) },
                                { label: t("dashboard.kpi.new"), value: formatNumber(retention?.new_members) },
                                { label: t("dashboard.kpi.reactivated"), value: formatNumber(retention?.reactivated_members) },
                            ]}
                            action={(
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button variant="outlined" size="small" onClick={() => setExpandedInsight("member_mix")}>
                                        {t("common.view")}
                                    </Button>
                                    <Button variant="outlined" size="small" onClick={() => setExpandedInsight("retention_health")}>
                                        {t("common.trend")}
                                    </Button>
                                </Stack>
                            )}
                        />
                        <InsightCard
                            title={t("dashboard.cards.notRenewedFollowUp")}
                            value={formatNumber(retention?.not_renewed_members ?? retention?.not_renewed_services)}
                            delta={comparisonDelta(
                                retention?.not_renewed_members ?? retention?.not_renewed_services,
                                comparisonRetention?.not_renewed_members ?? comparisonRetention?.not_renewed_services,
                                { periodLabel, invertTone: true, previousLabel: `vs ${t("common.previousPeriod")}` },
                            )}
                            caption={t("dashboard.caption.notRenewedAttention")}
                            details={[
                                { label: t("dashboard.kpi.inactive"), value: formatNumber(retention?.not_renewed_inactive) },
                                { label: t("dashboard.kpi.attendingUnpaid"), value: formatNumber(retention?.not_renewed_attending_unpaid) },
                                { label: t("dashboard.kpi.attendingPaid"), value: formatNumber(retention?.not_renewed_attending_paid) },
                            ]}
                            action={(
                                <Link href={retentionFollowUpHref}>
                                    <Button variant="outlined" size="small">{t("dashboard.actions.openFollowUpList")}</Button>
                                </Link>
                            )}
                        />
                        {canViewMoney && (
                            <InsightCard
                                title={t("dashboard.cards.valueAtRisk")}
                                value={formatMoney(retention?.not_renewed_value)}
                                caption={t("dashboard.caption.valueAtRisk")}
                                details={[
                                    { label: t("dashboard.kpi.postExpirationVisits"), value: formatNumber(retention?.not_renewed_post_expiration_attendance) },
                                    { label: t("dashboard.kpi.paidVisits"), value: formatNumber(retention?.not_renewed_post_expiration_paid_attendance) },
                                    { label: t("dashboard.kpi.unpaidVisits"), value: formatNumber(retention?.not_renewed_post_expiration_unpaid_attendance) },
                                ]}
                            />
                        )}
                    </div>

                    <MemberTrendChart rows={retentionTrendRows} t={t} />

                    {retention?.tracked_pricing_options === 0 && (
                        <Alert severity="warning">
                            {t("dashboard.warning.noRetentionProducts")}
                        </Alert>
                    )}
                    {retention?.snapshot_rows === 0 && (
                        <Alert severity="warning">
                            {t("dashboard.warning.noMembershipSnapshots")}
                        </Alert>
                    )}

                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
                        <RetentionSummaryTableCard
                            title={t("dashboard.tables.notRenewedClients")}
                            rows={retention?.not_renewed_clients}
                            tableKey="not_renewed"
                            onExpand={() => openRetentionTable("not_renewed")}
                            t={t}
                        />
                        <RetentionSummaryTableCard
                            title={t("dashboard.tables.retainedMembers")}
                            rows={retention?.retained_samples}
                            tableKey="retained"
                            onExpand={() => openRetentionTable("retained")}
                            t={t}
                        />
                        <RetentionSummaryTableCard
                            title={t("dashboard.tables.newMembers")}
                            rows={retention?.new_member_samples}
                            tableKey="new_members"
                            onExpand={() => openRetentionTable("new_members")}
                            t={t}
                        />
                        <RetentionSummaryTableCard
                            title={t("dashboard.tables.reactivatedMembers")}
                            rows={retention?.reactivated_samples}
                            tableKey="reactivated"
                            onExpand={() => openRetentionTable("reactivated")}
                            t={t}
                        />
                    </div>

                    <div>
                        <Link href={retentionFollowUpHref}>
                            <Button variant="outlined">{t("dashboard.actions.openRetentionFollowUp")}</Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Dialogs ────────────────────────────────────────────────────── */}

            <Dialog open={expandedInsight === "member_mix"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="lg">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.currentMemberMixHistory")}</span>
                        <IconButton aria-label="Close member mix history" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={memberMixTrendView}
                        onChange={(_, value) => setMemberMixTrendView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label={t("dashboard.kpi.currentMembers")} value="members" />
                        <Tab label={t("dashboard.kpi.renewalRate")} value="renewal" />
                        <Tab label={t("dashboard.tabs.movement")} value="movement" />
                    </Tabs>
                    <MemberMixHistoryChart rows={memberMixTrendRows} view={memberMixTrendView} t={t} />
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

            <Dialog open={expandedInsight === "retention_tables"} onClose={() => setExpandedInsight(null)} fullWidth maxWidth="xl">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>{t("dashboard.modal.retentionDetailTables")}</span>
                        <IconButton aria-label="Close retention tables" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={activeRetentionTable}
                        onChange={(_, value) => setActiveRetentionTable(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label={`${t("retention.status.notRenewed")} (${formatNumber(retentionTables?.not_renewed?.count || 0)})`} value="not_renewed" />
                        <Tab label={`${t("retention.status.retained")} (${formatNumber(retentionTables?.retained?.count || 0)})`} value="retained" />
                        <Tab label={`${t("retention.status.new")} (${formatNumber(retentionTables?.new_members?.count || 0)})`} value="new_members" />
                        <Tab label={`${t("retention.status.reactivated")} (${formatNumber(retentionTables?.reactivated?.count || 0)})`} value="reactivated" />
                    </Tabs>
                    {retentionTablesLoading ? (
                        <LinearProgress />
                    ) : (
                        <RetentionDetailTable
                            rows={retentionTables?.[activeRetentionTable]?.rows || []}
                            tableKey={activeRetentionTable}
                            t={t}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </MainPage>
    );
}

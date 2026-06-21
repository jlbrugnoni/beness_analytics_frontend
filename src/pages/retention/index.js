import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useI18n from "@/hooks/useI18n";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
import {
    RetentionActivityDialog,
    RetentionPurchaseHistoryDialog,
} from "@/utils/dashboardHelpers";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";


const formatMoney = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatActivityStatus = (value, t) => ({
    inactive: t("dashboard.activity.inactive"),
    attending_unpaid: t("dashboard.activity.attendingUnpaid"),
    attending_paid: t("dashboard.activity.attendingPaid"),
}[value] || "N/A");
const formatPriorityLevel = (value, t) => ({
    high: t("retention.priority.high"),
    medium: t("retention.priority.medium"),
    low: t("retention.priority.low"),
}[value] || "N/A");
const formatPriorityReasons = (reasons, t) => (reasons || [])
    .map((reason) => t(`retention.priority.reason.${reason}`))
    .join(" | ");
const formatRetentionStatus = (value, t) => ({
    not_renewed: t("retention.status.notRenewed"),
    retained: t("retention.status.retained"),
    new: t("retention.status.new"),
    new_non_member: t("retention.status.newNonMembers"),
    reactivated: t("retention.status.reactivated"),
}[value] || value || "N/A");


const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;


const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1).padStart(2, "0");
    return { value, labelKey: `months.${value}` };
});


const yearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 3 + index);
};


const currentMonthValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};


const lastCompletedMonthValue = () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = previousMonth.getFullYear();
    const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};


const monthParts = (monthValue) => {
    const [year, month] = monthValue.split("-");
    return { year, month };
};


const buildMonthValue = (year, month) => `${year}-${month}`;


const addMonths = (monthValue, amount) => {
    const [year, month] = monthValue.split("-").map(Number);
    const date = new Date(year, month - 1 + amount, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};


const monthRange = (monthValue) => {
    const [year, month] = monthValue.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
        date_from: `${monthValue}-01`,
        date_to: `${monthValue}-${String(lastDay).padStart(2, "0")}`,
    };
};


const selectedDateRange = (periodMode, filters) => {
    if (periodMode === "last_completed_month") return monthRange(lastCompletedMonthValue());
    if (periodMode === "current_month") return monthRange(currentMonthValue());
    if (periodMode === "specific_month") return monthRange(filters.month);
    return { date_from: filters.date_from, date_to: filters.date_to };
};


const retentionStorageKey = "beness.retention.filters";


const retentionDefaultState = () => {
    const defaultMonth = lastCompletedMonthValue();
    return {
        periodMode: "last_completed_month",
        filters: {
            site: "",
            studio: "",
            month: defaultMonth,
            date_from: monthRange(defaultMonth).date_from,
            date_to: monthRange(defaultMonth).date_to,
            status: "not_renewed",
            activity: "all",
            search: "",
        },
    };
};


const firstQueryValue = (value) => Array.isArray(value) ? value[0] : value;


const hasRetentionQuery = (query) => [
    "site",
    "studio",
    "period",
    "periodMode",
    "month",
    "date_from",
    "date_to",
    "status",
    "activity",
    "search",
].some((key) => firstQueryValue(query?.[key]));


const retentionStateFromQuery = (query, fallbackState) => ({
    periodMode: firstQueryValue(query.period) || firstQueryValue(query.periodMode) || fallbackState.periodMode,
    filters: {
        ...fallbackState.filters,
        site: firstQueryValue(query.site) || "",
        studio: firstQueryValue(query.studio) || "",
        month: firstQueryValue(query.month) || fallbackState.filters.month,
        date_from: firstQueryValue(query.date_from) || fallbackState.filters.date_from,
        date_to: firstQueryValue(query.date_to) || fallbackState.filters.date_to,
        status: firstQueryValue(query.status) || fallbackState.filters.status,
        activity: firstQueryValue(query.activity) || fallbackState.filters.activity,
        search: firstQueryValue(query.search) || "",
    },
});


const retentionQueryFromState = (periodMode, filters) => {
    const query = {
        period: periodMode,
        month: filters.month,
        date_from: filters.date_from,
        date_to: filters.date_to,
        status: filters.status,
    };
    if (filters.status === "not_renewed" && filters.activity !== "all") {
        query.activity = filters.activity;
    }
    if (filters.site) query.site = filters.site;
    if (filters.studio) query.studio = filters.studio;
    if (filters.search) query.search = filters.search;
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


const formatDisplayDate = (value, t) => {
    if (!value) return "N/A";
    const [year, month, day] = value.split("-").map(Number);
    return `${t(`monthsShort.${String(month).padStart(2, "0")}`)} ${day}, ${year}`;
};


export default function RetentionFollowUp() {
    const token = useFetchToken();
    const router = useRouter();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const initialRetentionState = useMemo(() => retentionDefaultState(), []);

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [periodMode, setPeriodMode] = useState(initialRetentionState.periodMode);
    const [filtersHydrated, setFiltersHydrated] = useState(false);
    const [filters, setFilters] = useState(initialRetentionState.filters);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [activityCounts, setActivityCounts] = useState({
        all: 0,
        attending_unpaid: 0,
        attending_paid: 0,
        inactive: 0,
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [activityOpen, setActivityOpen] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState("");
    const [activityDetails, setActivityDetails] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [historyDetails, setHistoryDetails] = useState(null);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

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

    const fetchRows = async (nextPeriodMode = periodMode, nextFilters = filters) => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            const dateFilters = selectedDateRange(nextPeriodMode, nextFilters);
            const requestFilters = {
                site: nextFilters.site,
                studio: nextFilters.studio,
                status: nextFilters.status,
                search: nextFilters.search,
                ...dateFilters,
            };
            if (nextFilters.status === "not_renewed" && nextFilters.activity !== "all") {
                requestFilters.activity = nextFilters.activity;
            }
            Object.entries(requestFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await axios.get(`${backendUrl}/api/data/analytics/retention-followup/?${params.toString()}`, authHeaders);
            setRows(response.data.rows || []);
            setCount(response.data.count || 0);
            setActivityCounts(response.data.activity_counts || {
                all: 0,
                attending_unpaid: 0,
                attending_paid: 0,
                inactive: 0,
            });
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading retention follow-up.");
        } finally {
            setLoading(false);
        }
    };

    const exportCsv = () => {
        const dateFilters = selectedDateRange(periodMode, filters);
        const headers = [
            "Month",
            "Client",
            "MindBody ID",
            "Studio",
            "Service",
            "Sale Date",
            "Activation Date",
            "Expiration Date",
            "Membership Days",
            "Previous Membership Days",
            "Amount",
            "Tracked Membership Purchases",
            "First Membership Purchase",
            "Last Membership Purchase",
            "Lifetime Membership Value",
            "Priority",
            "Priority Score",
            "Priority Reasons",
            "Not Renewed Activity",
            "Post-expiration Attendance",
            "Post-expiration Unpaid Attendance",
            "Post-expiration Paid Attendance",
            "Post-expiration Revenue",
            "Post-expiration First Visit",
            "Post-expiration Last Visit",
            "Post-expiration Pricing Options",
        ];
        const lines = rows.map((row) => [
            row.month,
            row.client,
            row.client_mindbody_id,
            row.studio,
            row.service,
            row.sale_date,
            row.activation_date,
            row.expiration_date,
            row.membership_days,
            row.previous_membership_days,
            row.total_amount,
            row.tracked_membership_purchase_count,
            row.first_membership_purchase_date,
            row.last_membership_purchase_date,
            row.lifetime_membership_value,
            formatPriorityLevel(row.priority_level, t),
            row.priority_score,
            formatPriorityReasons(row.priority_reasons, t),
            formatActivityStatus(row.not_renewed_activity_status, t),
            row.post_expiration_attendance_count,
            row.post_expiration_unpaid_attendance_count,
            row.post_expiration_paid_attendance_count,
            row.post_expiration_revenue,
            row.post_expiration_first_visit_date,
            row.post_expiration_last_visit_date,
            (row.post_expiration_pricing_options || []).join(" | "),
        ].map(csvValue).join(","));
        const blob = new Blob([[headers.map(csvValue).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `retention-followup-${filters.status}-${dateFilters.date_from}-${dateFilters.date_to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const rebuildSnapshots = async () => {
        if (!window.confirm(t("retention.rebuildConfirm"))) return;
        setLoading(true);
        setError("");
        try {
            const dateFilters = selectedDateRange(periodMode, filters);
            await axios.post(`${backendUrl}/api/data/analytics/membership-months/rebuild/`, {
                site: filters.site,
                ...dateFilters,
            }, authHeaders);
            await fetchRows();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || "Error rebuilding membership snapshots.");
        } finally {
            setLoading(false);
        }
    };

    const openActivity = async (row) => {
        if (row.status !== "not_renewed") return;
        setActivityOpen(true);
        setActivityLoading(true);
        setActivityError("");
        setActivityDetails(null);
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/retention-followup/${row.id}/activity/`,
                authHeaders,
            );
            setActivityDetails(response.data);
        } catch (err) {
            setActivityError(
                err.response?.data?.detail || t("retention.activity.loadError"),
            );
        } finally {
            setActivityLoading(false);
        }
    };

    const openHistory = async (row) => {
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryError("");
        setHistoryDetails(null);
        try {
            const historyPath = row.history_client_id
                ? `retention-clients/${row.history_client_id}/purchase-history`
                : `retention-followup/${row.id}/purchase-history`;
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/${historyPath}/`,
                authHeaders,
            );
            setHistoryDetails(response.data);
        } catch (err) {
            setHistoryError(
                err.response?.data?.detail || t("retention.history.loadError"),
            );
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!router.isReady) return;
        let nextState = initialRetentionState;
        if (hasRetentionQuery(router.query)) {
            nextState = retentionStateFromQuery(router.query, initialRetentionState);
        } else if (typeof window !== "undefined") {
            try {
                const storedState = JSON.parse(window.localStorage.getItem(retentionStorageKey) || "null");
                if (storedState) {
                    nextState = {
                        periodMode: storedState.periodMode || initialRetentionState.periodMode,
                        filters: { ...initialRetentionState.filters, ...(storedState.filters || {}) },
                    };
                }
            } catch {
                nextState = initialRetentionState;
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
            window.localStorage.setItem(retentionStorageKey, JSON.stringify(state));
        }
        const nextQuery = retentionQueryFromState(periodMode, filters);
        if (!sameQuery(router.query, nextQuery)) {
            router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
        }
    }, [filtersHydrated, router.isReady, periodMode, filters]);

    useEffect(() => {
        if (!filtersHydrated) return;
        fetchRows();
    }, [token, filtersHydrated]);

    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const activeDateRange = selectedDateRange(periodMode, filters);
    const selectedMonthParts = monthParts(activeDateRange.date_from.slice(0, 7));
    const activeMonthValue = activeDateRange.date_from.slice(0, 7);
    const activeMonthParts = monthParts(activeMonthValue);
    const activePeriodTitle = periodMode === "range"
        ? t("retention.period.dateRange")
        : `${t(`months.${activeMonthParts.month}`)} ${activeMonthParts.year}`;
    const showingNewNonMembers = filters.status === "new_non_members";
    const showingNotRenewed = filters.status === "not_renewed";

    const navigateMonth = (direction) => {
        const nextFilters = {
            ...filters,
            month: addMonths(activeMonthValue, direction),
        };
        setPeriodMode("specific_month");
        setFilters(nextFilters);
        fetchRows("specific_month", nextFilters);
    };

    const selectActivity = (activity) => {
        const nextFilters = { ...filters, activity };
        setFilters(nextFilters);
        fetchRows(periodMode, nextFilters);
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("retention.title")}</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>{t("retention.title")}</h1>
                </div>

                <div style={{ width: "90%", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper style={{ padding: "16px", display: "grid", gap: "12px" }}>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
                            style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "12px" }}
                        >
                            <Tooltip title={t("dashboard.previousMonth")}>
                                <span>
                                    <IconButton onClick={() => navigateMonth(-1)} disabled={loading}>
                                        <ChevronLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <div style={{ minWidth: "220px", textAlign: "center" }}>
                                <div style={{ fontSize: "17px", fontWeight: 700, lineHeight: 1.3 }}>
                                    {activePeriodTitle}
                                </div>
                                <div style={{ color: "#666", fontSize: "12px" }}>
                                    {formatDisplayDate(activeDateRange.date_from, t)} - {formatDisplayDate(activeDateRange.date_to, t)}
                                </div>
                            </div>
                            <Tooltip title={t("dashboard.nextMonth")}>
                                <span>
                                    <IconButton onClick={() => navigateMonth(1)} disabled={loading}>
                                        <ChevronRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                            <TextField
                                select
                                label={t("common.site")}
                                value={filters.site}
                                onChange={(event) => setFilters({ ...filters, site: event.target.value, studio: "" })}
                            >
                                <MenuItem value="">{t("dashboard.allSites")}</MenuItem>
                                {sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label={t("common.studio")}
                                value={filters.studio}
                                onChange={(event) => setFilters({ ...filters, studio: event.target.value })}
                            >
                                <MenuItem value="">{t("dashboard.allStudios")}</MenuItem>
                                {visibleStudios.map((studio) => (
                                    <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label={t("common.status")}
                                value={filters.status}
                                onChange={(event) => setFilters({
                                    ...filters,
                                    status: event.target.value,
                                    activity: "all",
                                })}
                            >
                                <MenuItem value="not_renewed">{t("retention.status.notRenewed")}</MenuItem>
                                <MenuItem value="retained">{t("retention.status.retained")}</MenuItem>
                                <MenuItem value="new">{t("retention.status.new")}</MenuItem>
                                <MenuItem value="new_non_members">{t("retention.status.newNonMembers")}</MenuItem>
                                <MenuItem value="reactivated">{t("retention.status.reactivated")}</MenuItem>
                            </TextField>
                            <TextField
                                label={t("common.search")}
                                value={filters.search}
                                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                            />
                        </div>
                        <div>
                            <Button
                                variant="text"
                                onClick={() => setAdvancedFiltersOpen((open) => !open)}
                            >
                                {advancedFiltersOpen ? t("common.close") : t("common.advanced")}
                            </Button>
                        </div>
                        {advancedFiltersOpen && (
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <TextField
                                    select
                                    label={t("common.period")}
                                    value={periodMode}
                                    onChange={(event) => setPeriodMode(event.target.value)}
                                >
                                    <MenuItem value="specific_month">{t("dashboard.period.specificMonth")}</MenuItem>
                                    <MenuItem value="last_completed_month">{t("dashboard.period.lastCompletedMonth")}</MenuItem>
                                    <MenuItem value="current_month">{t("dashboard.period.currentMonth")}</MenuItem>
                                    <MenuItem value="range">{t("retention.period.dateRange")}</MenuItem>
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
                            </div>
                        )}
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <Button variant="contained" onClick={() => fetchRows()} disabled={loading}>
                                {loading ? t("common.loading") : t("retention.applyFilters")}
                            </Button>
                            <Button variant="outlined" onClick={rebuildSnapshots} disabled={loading}>
                                {t("retention.rebuildSnapshots")}
                            </Button>
                            <Button variant="outlined" onClick={exportCsv} disabled={!rows.length}>
                                {t("retention.exportCsv")}
                            </Button>
                        </div>
                    </Paper>

                    <Paper style={{ padding: "16px" }}>
                        {filters.status === "not_renewed" && (
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ color: "#666", fontSize: "13px", marginBottom: "8px" }}>
                                    {t("retention.activity.filter")}
                                </div>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    {[
                                        { value: "all", label: t("retention.activity.all"), color: "primary" },
                                        { value: "attending_unpaid", label: t("dashboard.activity.attendingUnpaid"), color: "warning" },
                                        { value: "attending_paid", label: t("dashboard.activity.attendingPaid"), color: "success" },
                                        { value: "inactive", label: t("dashboard.activity.inactive"), color: "inherit" },
                                    ].map((option) => (
                                        <Button
                                            key={option.value}
                                            size="small"
                                            color={option.color}
                                            variant={filters.activity === option.value ? "contained" : "outlined"}
                                            onClick={() => selectActivity(option.value)}
                                            disabled={loading}
                                            style={{ textTransform: "none" }}
                                        >
                                            {option.label} ({activityCounts[option.value] || 0})
                                        </Button>
                                    ))}
                                </Stack>
                            </div>
                        )}
                        <h2 style={{ marginTop: 0 }}>{count.toLocaleString()} {t("common.records")}</h2>
                        <TableContainer style={{ maxHeight: 620 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t("common.client")}</TableCell>
                                        <TableCell>{t("common.month")}</TableCell>
                                        <TableCell>{t("common.studio")}</TableCell>
                                        <TableCell>{t("common.service")}</TableCell>
                                        {showingNewNonMembers ? (
                                            <TableCell>{t("dashboard.table.purchaseDate")}</TableCell>
                                        ) : (
                                            <>
                                                {showingNotRenewed && (
                                                    <TableCell>{t("retention.priority.title")}</TableCell>
                                                )}
                                                <TableCell>{t("common.activity")}</TableCell>
                                                <TableCell align="right">{t("common.days")}</TableCell>
                                            </>
                                        )}
                                        <TableCell align="right">{t("common.amount")}</TableCell>
                                        {!showingNewNonMembers && (
                                            <TableCell align="right">{t("common.purchases")}</TableCell>
                                        )}
                                        <TableCell>{t("common.history")}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, index) => (
                                        <TableRow key={`${row.client_id}-${row.expiration_date}-${index}`}>
                                            <TableCell>
                                                <div>{row.client || "N/A"}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>{row.client_mindbody_id || ""}</div>
                                            </TableCell>
                                            <TableCell>{row.month || "N/A"}</TableCell>
                                            <TableCell>
                                                {row.studio || t("common.unknown")}
                                            </TableCell>
                                            <TableCell>{row.service || "N/A"}</TableCell>
                                            {showingNewNonMembers ? (
                                                <TableCell>{row.sale_date || "N/A"}</TableCell>
                                            ) : (
                                                <>
                                                    {showingNotRenewed && (
                                                        <TableCell>
                                                            <div>{formatPriorityLevel(row.priority_level, t)}</div>
                                                            {!!row.priority_score && (
                                                                <div style={{ color: "#666", fontSize: "12px" }}>
                                                                    {row.priority_score} {t("retention.priority.points")}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        {row.status === "not_renewed"
                                                        && row.not_renewed_activity_status !== "inactive" ? (
                                                            <Button
                                                                variant="text"
                                                                size="small"
                                                                onClick={() => openActivity(row)}
                                                                style={{ padding: 0, minWidth: 0, textTransform: "none" }}
                                                            >
                                                                {formatActivityStatus(row.not_renewed_activity_status, t)}
                                                            </Button>
                                                        ) : (
                                                            <div>{formatActivityStatus(row.not_renewed_activity_status, t)}</div>
                                                        )}
                                                        {!!row.post_expiration_attendance_count && (
                                                            <div style={{ color: "#666", fontSize: "12px" }}>
                                                                {row.post_expiration_attendance_count} {t("retention.visits")} / {formatMoney(row.post_expiration_revenue)}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">{row.membership_days || row.previous_membership_days || "N/A"}</TableCell>
                                                </>
                                            )}
                                            <TableCell align="right">{formatMoney(row.total_amount)}</TableCell>
                                            {!showingNewNonMembers && (
                                                <TableCell align="right">{row.tracked_membership_purchase_count || 0}</TableCell>
                                            )}
                                            <TableCell>
                                                <Button
                                                    variant="text"
                                                    size="small"
                                                    onClick={() => openHistory(row)}
                                                    style={{ padding: 0, minWidth: 0, textTransform: "none" }}
                                                >
                                                    {t("retention.history.open")}
                                                </Button>
                                                <div>{formatMoney(row.lifetime_membership_value)}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>
                                                    {row.first_membership_purchase_date || "N/A"} - {row.last_membership_purchase_date || "N/A"}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!rows.length && (
                                        <TableRow>
                                            <TableCell colSpan={showingNewNonMembers ? 7 : (showingNotRenewed ? 10 : 9)}>{t("common.noData")}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </div>
            </div>

            <RetentionActivityDialog
                open={activityOpen}
                onClose={() => setActivityOpen(false)}
                loading={activityLoading}
                error={activityError}
                details={activityDetails}
                t={t}
            />
            <RetentionPurchaseHistoryDialog
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                loading={historyLoading}
                error={historyError}
                details={historyDetails}
                t={t}
            />
        </MainPage>
    );
}

import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useI18n from "@/hooks/useI18n";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";


const previousMonthValue = () => {
    const value = new Date();
    value.setDate(1);
    value.setMonth(value.getMonth() - 1);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
};


const addMonths = (monthValue, amount) => {
    const [year, month] = monthValue.split("-").map(Number);
    const value = new Date(year, month - 1 + amount, 1);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
};


const firstQueryValue = (value) => Array.isArray(value) ? value[0] : value;


const defaultDirectoryState = () => ({
    filters: {
        site: "",
        studio: "",
        period: "month",
        metric_period: "lifetime",
        month: previousMonthValue(),
        status: "",
        search: "",
    },
    ordering: "client",
    page: 0,
    rowsPerPage: 25,
});


const directoryStateFromQuery = (query) => {
    const defaults = defaultDirectoryState();
    const page = Number(firstQueryValue(query.page));
    const pageSize = Number(firstQueryValue(query.page_size));
    return {
        filters: {
            site: firstQueryValue(query.site) || "",
            studio: firstQueryValue(query.studio) || "",
            period: firstQueryValue(query.period) || defaults.filters.period,
            metric_period: firstQueryValue(query.metric_period) || defaults.filters.metric_period,
            month: firstQueryValue(query.month) || defaults.filters.month,
            status: firstQueryValue(query.status) || "",
            search: firstQueryValue(query.search) || "",
        },
        ordering: firstQueryValue(query.ordering) || defaults.ordering,
        page: Number.isFinite(page) && page > 0 ? page - 1 : defaults.page,
        rowsPerPage: [15, 25, 50, 100].includes(pageSize) ? pageSize : defaults.rowsPerPage,
    };
};


const queryFromAsPath = (asPath) => {
    const queryString = asPath.includes("?") ? asPath.split("?")[1] : "";
    return Object.fromEntries(new URLSearchParams(queryString));
};


const directoryQuery = (filters, ordering, page, rowsPerPage) => ({
    period: filters.period,
    metric_period: filters.metric_period,
    month: filters.month,
    ordering,
    page: String(page + 1),
    page_size: String(rowsPerPage),
    ...(filters.site ? { site: filters.site } : {}),
    ...(filters.studio ? { studio: filters.studio } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
});


const clientDirectoryParams = (filters, ordering, page, rowsPerPage) => {
    const params = new URLSearchParams({
        period: filters.period,
        metric_period: filters.metric_period,
        month: filters.month,
        ordering,
        page: String(page + 1),
        page_size: String(rowsPerPage),
    });
    ["site", "studio", "status", "search"].forEach((key) => {
        if (filters[key]) params.set(key, filters[key]);
    });
    return params;
};


const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatPercent = (value) => `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
})}%`;
const formatMoney = (value, restrictedLabel) => {
    if (value === null || value === undefined) return restrictedLabel;
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


const statusLabel = (status, t) => {
    const labels = {
        retained: "retention.status.retained",
        new: "retention.status.new",
        reactivated: "retention.status.reactivated",
        not_renewed: "retention.status.notRenewed",
    };
    return status ? t(labels[status], status) : t("common.none");
};


const csvValue = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
};


const downloadTextFile = (fileName, text, mimeType) => {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};


export default function ClientsDirectory() {
    const router = useRouter();
    const token = useFetchToken();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const initialState = useMemo(() => defaultDirectoryState(), []);
    const [rows, setRows] = useState([]);
    const [filtersData, setFiltersData] = useState({ sites: [], studios: [], membership_statuses: [] });
    const [filters, setFilters] = useState(initialState.filters);
    const [appliedFilters, setAppliedFilters] = useState(initialState.filters);
    const [ordering, setOrdering] = useState(initialState.ordering);
    const [page, setPage] = useState(initialState.page);
    const [rowsPerPage, setRowsPerPage] = useState(initialState.rowsPerPage);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const [hydrated, setHydrated] = useState(false);
    const [metricsFiltersOpen, setMetricsFiltersOpen] = useState(false);

    useEffect(() => {
        if (!router.isReady) return;
        const state = directoryStateFromQuery(queryFromAsPath(router.asPath));
        setFilters(state.filters);
        setAppliedFilters(state.filters);
        setOrdering(state.ordering);
        setPage(state.page);
        setRowsPerPage(state.rowsPerPage);
        setHydrated(true);
    }, [router.isReady, router.asPath]);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchClients = useCallback(async () => {
        if (!token || !hydrated) return;
        setLoading(true);
        setError("");
        const params = clientDirectoryParams(appliedFilters, ordering, page, rowsPerPage);
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/clients/?${params.toString()}`,
                authHeaders,
            );
            setRows(response.data.results || []);
            setCount(response.data.count || 0);
            setFiltersData(response.data.filters || { sites: [], studios: [], membership_statuses: [] });
        } catch (err) {
            setError(err.response?.data?.detail || t("clients.loadError"));
        } finally {
            setLoading(false);
        }
    }, [token, hydrated, backendUrl, authHeaders, appliedFilters, ordering, page, rowsPerPage, t]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const applyFilters = (nextFilters = filters) => {
        setPage(0);
        setAppliedFilters(nextFilters);
        router.replace({
            pathname: "/clients",
            query: directoryQuery(nextFilters, ordering, 0, rowsPerPage),
        }, undefined, { shallow: true });
    };

    const changeMonth = (amount) => {
        const next = { ...filters, month: addMonths(filters.month, amount) };
        setFilters(next);
        applyFilters(next);
    };

    const visibleStudios = filters.site
        ? filtersData.studios.filter((studio) => String(studio.site_id) === String(filters.site))
        : filtersData.studios;

    const setFilter = (key, value) => {
        setFilters((current) => {
            const next = { ...current, [key]: value };
            if (key === "site" && current.studio) {
                const studio = filtersData.studios.find((item) => String(item.id) === String(current.studio));
                if (studio && String(studio.site_id) !== String(value)) next.studio = "";
            }
            return next;
        });
    };

    const toggleOrdering = (field) => {
        const nextOrdering = ordering === field ? `-${field}` : field;
        setPage(0);
        setOrdering(nextOrdering);
        router.replace({
            pathname: "/clients",
            query: directoryQuery(appliedFilters, nextOrdering, 0, rowsPerPage),
        }, undefined, { shallow: true });
    };

    const SortLabel = ({ field, children }) => {
        const active = ordering.replace("-", "") === field;
        const descending = ordering === `-${field}`;
        return (
            <Button
                variant="text"
                size="small"
                color="inherit"
                onClick={() => toggleOrdering(field)}
                endIcon={active ? (descending ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />) : null}
                style={{ fontWeight: 700, minWidth: 0 }}
            >
                {children}
            </Button>
        );
    };

    const openClient = (clientId) => router.push({
        pathname: "/clients/[id]",
        query: {
            id: clientId,
            period: appliedFilters.metric_period,
            month: appliedFilters.month,
            return_to: router.asPath,
        },
    });

    const exportCsv = async () => {
        if (!token) return;
        setExporting(true);
        setError("");
        try {
            const pageSize = 100;
            let nextPage = 0;
            let pages = 1;
            let exportRows = [];
            while (nextPage < pages) {
                const params = clientDirectoryParams(appliedFilters, ordering, nextPage, pageSize);
                const response = await axios.get(
                    `${backendUrl}/api/data/analytics/clients/?${params.toString()}`,
                    authHeaders,
                );
                exportRows = exportRows.concat(response.data.results || []);
                pages = response.data.pages || 0;
                nextPage += 1;
                if (!pages) break;
            }

            const columns = [
                [t("common.client"), (row) => row.client],
                ["Mindbody ID", (row) => row.mindbody_id],
                ["Email", (row) => row.email],
                ["Phone", (row) => row.phone],
                [t("common.site"), (row) => row.site],
                [t("common.status"), (row) => statusLabel(row.membership_status, t)],
                [t("clients.primaryStudio"), (row) => row.primary_studio],
                [t("clients.lastVisit"), (row) => row.last_visit_date],
                [t("clients.daysSinceLastVisit"), (row) => row.days_since_last_visit],
                [t("clients.visits"), (row) => row.attended_visits],
                [t("clients.activeWeeks"), (row) => row.active_weeks],
                [t("clients.trackedPurchases"), (row) => row.tracked_purchase_count],
                [t("clients.clientSince"), (row) => row.client_since],
                [t("clients.totalBookings"), (row) => row.total_bookings],
                [t("clients.attendanceRate"), (row) => row.attendance_rate],
                [t("clients.noShowRate"), (row) => row.no_show_rate],
                [t("clients.lateCancelRate"), (row) => row.late_cancel_rate],
                [t("clients.totalSpending"), (row) => row.total_spending],
            ];
            const csvLines = [
                columns.map(([header]) => csvValue(header)).join(","),
                ...exportRows.map((row) => (
                    columns.map(([, getter]) => csvValue(getter(row))).join(",")
                )),
            ];
            const fileName = `clients-${appliedFilters.month}-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadTextFile(fileName, csvLines.join("\n"), "text/csv;charset=utf-8");
        } catch (err) {
            setError(err.response?.data?.detail || t("clients.exportError"));
        } finally {
            setExporting(false);
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("clients.title")}</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>{t("clients.title")}</h1>
                </div>

                <div style={{ width: "95%", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Paper style={{ padding: "18px", display: "grid", gap: "14px" }}>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                            <TextField
                                select
                                size="small"
                                label={t("common.site")}
                                value={filters.site}
                                onChange={(event) => setFilter("site", event.target.value)}
                            >
                                <MenuItem value="">{t("clients.allSites")}</MenuItem>
                                {filtersData.sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label={t("common.studio")}
                                value={filters.studio}
                                onChange={(event) => setFilter("studio", event.target.value)}
                            >
                                <MenuItem value="">{t("clients.allStudios")}</MenuItem>
                                {visibleStudios.map((studio) => (
                                    <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label={t("clients.populationPeriod")}
                                value={filters.period}
                                onChange={(event) => setFilter("period", event.target.value)}
                            >
                                <MenuItem value="month">{t("clients.period.month")}</MenuItem>
                                <MenuItem value="last_3_months">{t("clients.period.last3")}</MenuItem>
                                <MenuItem value="last_6_months">{t("clients.period.last6")}</MenuItem>
                                <MenuItem value="last_12_months">{t("clients.period.last12")}</MenuItem>
                                <MenuItem value="lifetime">{t("common.lifetime")}</MenuItem>
                            </TextField>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <IconButton size="small" onClick={() => changeMonth(-1)}>
                                    <ArrowBackIosNewIcon fontSize="small" />
                                </IconButton>
                                <TextField
                                    type="month"
                                    size="small"
                                    label={t("clients.period.endMonth")}
                                    value={filters.month}
                                    onChange={(event) => setFilter("month", event.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                                <IconButton size="small" onClick={() => changeMonth(1)}>
                                    <ArrowForwardIosIcon fontSize="small" />
                                </IconButton>
                            </div>
                            <TextField
                                select
                                size="small"
                                label={t("common.status")}
                                value={filters.status}
                                onChange={(event) => setFilter("status", event.target.value)}
                            >
                                <MenuItem value="">{t("clients.allStatuses")}</MenuItem>
                                {filtersData.membership_statuses.map((status) => (
                                    <MenuItem key={status.value} value={status.value}>
                                        {statusLabel(status.value, t)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                label={t("common.search")}
                                value={filters.search}
                                onChange={(event) => setFilter("search", event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") applyFilters();
                                }}
                                helperText={t("clients.searchHelp")}
                            />
                        </div>
                        <div>
                            <Button variant="contained" onClick={() => applyFilters()} disabled={loading}>
                                {loading ? t("common.loading") : t("common.apply")}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={exportCsv}
                                disabled={loading || exporting || count === 0}
                                style={{ marginLeft: "10px" }}
                            >
                                {exporting ? t("clients.exportingCsv") : t("clients.downloadCsv")}
                            </Button>
                        </div>
                        <div style={{ borderTop: "1px solid #eee", paddingTop: "10px" }}>
                            <Button
                                variant="text"
                                size="small"
                                onClick={() => setMetricsFiltersOpen((open) => !open)}
                            >
                                {metricsFiltersOpen
                                    ? t("clients.hideMetricsOptions")
                                    : `${t("clients.metricsOptions")}: ${t(
                                        filters.metric_period === "lifetime"
                                            ? "common.lifetime"
                                            : `clients.period.${{
                                                month: "month",
                                                last_3_months: "last3",
                                                last_6_months: "last6",
                                                last_12_months: "last12",
                                            }[filters.metric_period]}`,
                                    )}`}
                            </Button>
                        </div>
                        {metricsFiltersOpen && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                                paddingTop: "4px",
                            }}>
                                <TextField
                                    select
                                    size="small"
                                    label={t("clients.metricsPeriod")}
                                    value={filters.metric_period}
                                    onChange={(event) => setFilter("metric_period", event.target.value)}
                                    style={{ minWidth: "220px" }}
                                >
                                    <MenuItem value="lifetime">{t("common.lifetime")}</MenuItem>
                                    <MenuItem value="month">{t("clients.period.month")}</MenuItem>
                                    <MenuItem value="last_3_months">{t("clients.period.last3")}</MenuItem>
                                    <MenuItem value="last_6_months">{t("clients.period.last6")}</MenuItem>
                                    <MenuItem value="last_12_months">{t("clients.period.last12")}</MenuItem>
                                </TextField>
                                <Button variant="outlined" onClick={() => applyFilters()} disabled={loading}>
                                    {t("clients.applyMetrics")}
                                </Button>
                            </div>
                        )}
                    </Paper>

                    <Paper>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><SortLabel field="client">{t("common.client")}</SortLabel></TableCell>
                                        <TableCell><SortLabel field="membership_status">{t("common.status")}</SortLabel></TableCell>
                                        <TableCell><SortLabel field="primary_studio">{t("clients.primaryStudio")}</SortLabel></TableCell>
                                        <TableCell><SortLabel field="last_visit_date">{t("clients.lastVisit")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="attended_visits">{t("clients.visits")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="active_weeks">{t("clients.activeWeeks")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="tracked_purchase_count">{t("clients.trackedPurchases")}</SortLabel></TableCell>
                                        <TableCell><SortLabel field="client_since">{t("clients.clientSince")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="attendance_rate">{t("clients.attendanceRate")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="no_show_rate">{t("clients.noShowRate")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="late_cancel_rate">{t("clients.lateCancelRate")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="total_spending">{t("clients.totalSpending")}</SortLabel></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {!loading && rows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={12} align="center">{t("common.noRecordsFound")}</TableCell>
                                        </TableRow>
                                    )}
                                    {rows.map((row) => (
                                        <TableRow
                                            key={row.client_id}
                                            hover
                                            tabIndex={0}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => openClient(row.client_id)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") event.currentTarget.click();
                                            }}
                                        >
                                            <TableCell>
                                                <strong>{row.client}</strong>
                                                <div style={{ color: "#666", fontSize: "12px" }}>
                                                    {row.mindbody_id || "N/A"}
                                                </div>
                                            </TableCell>
                                            <TableCell>{statusLabel(row.membership_status, t)}</TableCell>
                                            <TableCell>{row.primary_studio || t("common.unknown")}</TableCell>
                                            <TableCell>
                                                <div>{row.last_visit_date || "N/A"}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>
                                                    {row.days_since_last_visit === null
                                                        ? ""
                                                        : `${formatNumber(row.days_since_last_visit)} ${t("common.days")}`}
                                                </div>
                                            </TableCell>
                                            <TableCell align="right">{formatNumber(row.attended_visits)}</TableCell>
                                            <TableCell align="right">{formatNumber(row.active_weeks)}</TableCell>
                                            <TableCell align="right">{formatNumber(row.tracked_purchase_count)}</TableCell>
                                            <TableCell>{row.client_since || "N/A"}</TableCell>
                                            <TableCell align="right">{formatPercent(row.attendance_rate)}</TableCell>
                                            <TableCell align="right">{formatPercent(row.no_show_rate)}</TableCell>
                                            <TableCell align="right">{formatPercent(row.late_cancel_rate)}</TableCell>
                                            <TableCell align="right">{formatMoney(row.total_spending, t("common.restricted"))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={count}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            onPageChange={(event, nextPage) => {
                                setPage(nextPage);
                                router.replace({
                                    pathname: "/clients",
                                    query: directoryQuery(
                                        appliedFilters,
                                        ordering,
                                        nextPage,
                                        rowsPerPage,
                                    ),
                                }, undefined, { shallow: true });
                            }}
                            onRowsPerPageChange={(event) => {
                                const nextRowsPerPage = Number(event.target.value);
                                setRowsPerPage(nextRowsPerPage);
                                setPage(0);
                                router.replace({
                                    pathname: "/clients",
                                    query: directoryQuery(
                                        appliedFilters,
                                        ordering,
                                        0,
                                        nextRowsPerPage,
                                    ),
                                }, undefined, { shallow: true });
                            }}
                            rowsPerPageOptions={[15, 25, 50, 100]}
                        />
                    </Paper>
                </div>
            </div>
        </MainPage>
    );
}

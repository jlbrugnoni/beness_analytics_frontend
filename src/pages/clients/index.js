import Head from "next/head";
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


export default function ClientsDirectory() {
    const token = useFetchToken();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [rows, setRows] = useState([]);
    const [filtersData, setFiltersData] = useState({ sites: [], studios: [], membership_statuses: [] });
    const [filters, setFilters] = useState({
        site: "",
        studio: "",
        period: "month",
        month: previousMonthValue(),
        status: "",
        search: "",
    });
    const [appliedFilters, setAppliedFilters] = useState(filters);
    const [ordering, setOrdering] = useState("client");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchClients = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
            period: appliedFilters.period,
            month: appliedFilters.month,
            ordering,
            page: String(page + 1),
            page_size: String(rowsPerPage),
        });
        ["site", "studio", "status", "search"].forEach((key) => {
            if (appliedFilters[key]) params.set(key, appliedFilters[key]);
        });
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
    }, [token, backendUrl, authHeaders, appliedFilters, ordering, page, rowsPerPage, t]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const applyFilters = (nextFilters = filters) => {
        setPage(0);
        setAppliedFilters(nextFilters);
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
        setPage(0);
        setOrdering((current) => current === field ? `-${field}` : field);
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
                                label={t("common.period")}
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
                        </div>
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
                                        <TableCell align="right"><SortLabel field="attendance_rate">{t("clients.attendanceRate")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="no_show_rate">{t("clients.noShowRate")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="late_cancel_rate">{t("clients.lateCancelRate")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="service_spending">{t("clients.serviceSpending")}</SortLabel></TableCell>
                                        <TableCell align="right"><SortLabel field="total_sales_spending">{t("clients.totalSales")}</SortLabel></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {!loading && rows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={11} align="center">{t("common.noRecordsFound")}</TableCell>
                                        </TableRow>
                                    )}
                                    {rows.map((row) => (
                                        <TableRow key={row.client_id} hover>
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
                                            <TableCell align="right">{formatPercent(row.attendance_rate)}</TableCell>
                                            <TableCell align="right">{formatPercent(row.no_show_rate)}</TableCell>
                                            <TableCell align="right">{formatPercent(row.late_cancel_rate)}</TableCell>
                                            <TableCell align="right">{formatMoney(row.service_spending, t("common.restricted"))}</TableCell>
                                            <TableCell align="right">{formatMoney(row.total_sales_spending, t("common.restricted"))}</TableCell>
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
                            onPageChange={(event, nextPage) => setPage(nextPage)}
                            onRowsPerPageChange={(event) => {
                                setRowsPerPage(Number(event.target.value));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[15, 25, 50, 100]}
                        />
                    </Paper>
                </div>
            </div>
        </MainPage>
    );
}

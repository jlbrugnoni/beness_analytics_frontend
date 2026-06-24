import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useI18n from "@/hooks/useI18n";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";


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
const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatPercent = (value) => `${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
})}%`;
const formatMoney = (value, restrictedLabel) => (
    value === null || value === undefined
        ? restrictedLabel
        : Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
);
const formatMonthLabel = (value) => {
    if (!value) return "";
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
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


const defaultFilters = () => ({
    site: "",
    studio: "",
    month: previousMonthValue(),
    status: "",
    metric_period: "month",
});


const queryFromFilters = (filters) => ({
    month: filters.month,
    metric_period: filters.metric_period,
    ...(filters.site ? { site: filters.site } : {}),
    ...(filters.studio ? { studio: filters.studio } : {}),
    ...(filters.status ? { status: filters.status } : {}),
});


function RankingCard({ title, rows, formatValue, onSelect, t }) {
    return (
        <Paper variant="outlined" style={{ padding: "16px", minHeight: "220px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>{title}</h2>
            {rows === null ? (
                <div style={{ color: "#666" }}>{t("common.restricted")}</div>
            ) : rows.length === 0 ? (
                <div style={{ color: "#666" }}>{t("common.noRecordsFound")}</div>
            ) : (
                <div style={{ display: "grid", gap: "7px" }}>
                    {rows.map((row, index) => (
                        <Button
                            key={row.client_id}
                            color="inherit"
                            onClick={() => onSelect(row.client_id)}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "28px minmax(0, 1fr) auto",
                                gap: "8px",
                                justifyContent: "stretch",
                                textAlign: "left",
                                textTransform: "none",
                                padding: "7px 4px",
                                minWidth: 0,
                            }}
                        >
                            <strong>{index + 1}</strong>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                {row.client}
                            </span>
                            <strong style={{ whiteSpace: "nowrap" }}>{formatValue(row.value)}</strong>
                        </Button>
                    ))}
                </div>
            )}
        </Paper>
    );
}


export default function TopClientsPage() {
    const router = useRouter();
    const token = useFetchToken();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [filters, setFilters] = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
    const [filtersData, setFiltersData] = useState({
        sites: [],
        studios: [],
        membership_statuses: [],
    });
    const [rankings, setRankings] = useState(null);
    const [hydrated, setHydrated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!router.isReady) return;
        const defaults = defaultFilters();
        const next = {
            site: firstQueryValue(router.query.site) || "",
            studio: firstQueryValue(router.query.studio) || "",
            month: firstQueryValue(router.query.month) || defaults.month,
            status: firstQueryValue(router.query.status) || "",
            metric_period: firstQueryValue(router.query.metric_period) || "month",
        };
        setFilters(next);
        setAppliedFilters(next);
        setHydrated(true);
    }, [router.isReady, router.query]);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchRankings = useCallback(async () => {
        if (!token || !hydrated) return;
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
            period: "month",
            month: appliedFilters.month,
            metric_period: appliedFilters.metric_period,
            page: "1",
            page_size: "1",
        });
        ["site", "studio", "status"].forEach((key) => {
            if (appliedFilters[key]) params.set(key, appliedFilters[key]);
        });
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/clients/?${params.toString()}`,
                authHeaders,
            );
            setRankings(response.data.rankings || {});
            setFiltersData(response.data.filters || {
                sites: [],
                studios: [],
                membership_statuses: [],
            });
        } catch (err) {
            setError(err.response?.data?.detail || t("clients.rankings.loadError"));
        } finally {
            setLoading(false);
        }
    }, [token, hydrated, backendUrl, authHeaders, appliedFilters, t]);

    useEffect(() => {
        fetchRankings();
    }, [fetchRankings]);

    const applyFilters = (next = filters) => {
        setAppliedFilters(next);
        router.replace({
            pathname: "/dashboard/top-clients",
            query: queryFromFilters(next),
        }, undefined, { shallow: true });
    };

    const changeMonth = (amount) => {
        const next = { ...filters, month: addMonths(filters.month, amount) };
        setFilters(next);
        applyFilters(next);
    };

    const handleSiteChange = (event) => {
        const next = { ...filters, site: event.target.value, studio: "" };
        setFilters(next);
        applyFilters(next);
    };

    const handleStudioChange = (event) => {
        const next = { ...filters, studio: event.target.value };
        setFilters(next);
        applyFilters(next);
    };

    const setFilter = (key, value) => {
        setFilters((current) => {
            const next = { ...current, [key]: value };
            if (key === "site" && current.studio) {
                const studio = filtersData.studios.find(
                    (item) => String(item.id) === String(current.studio),
                );
                if (studio && String(studio.site_id) !== String(value)) next.studio = "";
            }
            return next;
        });
    };

    const visibleStudios = filters.site
        ? filtersData.studios.filter(
            (studio) => String(studio.site_id) === String(filters.site),
        )
        : filtersData.studios;

    const openClient = (clientId) => router.push({
        pathname: "/clients/[id]",
        query: {
            id: clientId,
            period: appliedFilters.metric_period,
            month: appliedFilters.month,
            return_to: router.asPath,
        },
    });

    const definitions = [
        ["most_attended", "clients.rankings.mostAttended", formatNumber],
        ["highest_total_spending", "clients.rankings.highestSpending", (value) => (
            formatMoney(value, t("common.restricted"))
        )],
        ["most_active_weeks", "clients.rankings.mostActiveWeeks", formatNumber],
        ["most_regular_8_weeks", "clients.rankings.mostRegular8Weeks", formatPercent],
        ["longest_current_streak", "clients.rankings.longestCurrentStreak", formatNumber],
        ["best_attendance_rate", "clients.rankings.bestAttendanceRate", formatPercent],
        ["highest_no_show_rate", "clients.rankings.highestNoShowRate", formatPercent],
        ["most_recently_active", "clients.rankings.mostRecentlyActive", (value) => value || "N/A"],
    ];

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("dashboard.hub.topClients.title")}</title>
            </Head>
            <div className={styles.container}>
                <div style={{ width: "95%", display: "grid", gap: "16px" }}>
                    <Stack direction="row" alignItems="center" spacing={1} style={{ marginBottom: "4px" }}>
                        <IconButton size="small" onClick={() => router.push("/dashboard")}>
                            <ArrowBackIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">
                            {t("dashboard.title")} / {t("dashboard.hub.topClients.title")}
                        </Typography>
                    </Stack>
                    <div>
                        <h1 className={styles.title}>{t("dashboard.hub.topClients.title")}</h1>
                        <div style={{ color: "#666" }}>{t("clients.rankings.description")}</div>
                    </div>
                    {error && <Alert severity="error">{error}</Alert>}
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
                                    <IconButton onClick={() => changeMonth(-1)} disabled={loading}>
                                        <ChevronLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <div style={{ minWidth: "220px", textAlign: "center" }}>
                                <div style={{ fontSize: "17px", fontWeight: 700, lineHeight: 1.3 }}>
                                    {formatMonthLabel(filters.month)}
                                </div>
                                <div style={{ color: "#666", fontSize: "12px" }}>
                                    {t("clients.rankings.scope")}:{" "}
                                    {t(
                                        appliedFilters.metric_period === "lifetime"
                                            ? "common.lifetime"
                                            : `clients.period.${{
                                                month: "month",
                                                last_3_months: "last3",
                                                last_6_months: "last6",
                                                last_12_months: "last12",
                                            }[appliedFilters.metric_period]}`,
                                    )}
                                </div>
                            </div>
                            <Tooltip title={t("dashboard.nextMonth")}>
                                <span>
                                    <IconButton onClick={() => changeMonth(1)} disabled={loading}>
                                        <ChevronRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                            <TextField
                                select
                                size="small"
                                label={t("common.site")}
                                value={filters.site}
                                onChange={handleSiteChange}
                                style={{ minWidth: "220px" }}
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
                                onChange={handleStudioChange}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">{t("clients.allStudios")}</MenuItem>
                                {visibleStudios.map((studio) => (
                                    <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label={t("common.status")}
                                value={filters.status}
                                onChange={(event) => setFilter("status", event.target.value)}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">{t("clients.allStatuses")}</MenuItem>
                                {filtersData.membership_statuses.map((status) => (
                                    <MenuItem key={status.value} value={status.value}>
                                        {statusLabel(status.value, t)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label={t("clients.metricsPeriod")}
                                value={filters.metric_period}
                                onChange={(event) => setFilter("metric_period", event.target.value)}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="month">{t("clients.period.month")}</MenuItem>
                                <MenuItem value="last_3_months">{t("clients.period.last3")}</MenuItem>
                                <MenuItem value="last_6_months">{t("clients.period.last6")}</MenuItem>
                                <MenuItem value="last_12_months">{t("clients.period.last12")}</MenuItem>
                                <MenuItem value="lifetime">{t("common.lifetime")}</MenuItem>
                            </TextField>
                            <Button variant="contained" onClick={() => applyFilters()} disabled={loading}>
                                {loading ? t("common.loading") : t("common.apply")}
                            </Button>
                        </Stack>
                    </Paper>
                    {rankings && (
                        <div style={{
                            display: "grid",
                            gap: "14px",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        }}>
                            {definitions.map(([key, titleKey, formatter]) => (
                                <RankingCard
                                    key={key}
                                    title={t(titleKey)}
                                    rows={Object.prototype.hasOwnProperty.call(rankings, key)
                                        ? rankings[key]
                                        : []}
                                    formatValue={formatter}
                                    onSelect={openClient}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainPage>
    );
}

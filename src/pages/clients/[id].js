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
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";


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
const formatDate = (value) => value || "N/A";
const firstQueryValue = (value) => Array.isArray(value) ? value[0] : value;


const statusLabel = (status, t) => {
    const labels = {
        retained: "retention.status.retained",
        new: "retention.status.new",
        reactivated: "retention.status.reactivated",
        not_renewed: "retention.status.notRenewed",
    };
    return status ? t(labels[status], status) : "N/A";
};


function MetricCard({ label, value }) {
    return (
        <Paper variant="outlined" style={{ padding: "14px", minHeight: "76px" }}>
            <div style={{ color: "#666", fontSize: "13px", marginBottom: "7px" }}>{label}</div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{value}</div>
        </Paper>
    );
}


function SummaryPanel({ title, summary, t }) {
    if (!summary) return null;
    const cards = [
        [t("clients.visits"), formatNumber(summary.attended_visits)],
        [t("clients.totalBookings"), formatNumber(summary.total_bookings)],
        [t("clients.activeWeeks"), formatNumber(summary.active_weeks)],
        [t("clients.regularity8Weeks"), formatPercent(summary.regularity_8_weeks)],
        [
            t("clients.avgVisitsActiveWeek8"),
            formatNumber(summary.average_visits_per_active_week_8),
        ],
        [t("clients.currentStreak"), formatNumber(summary.current_attendance_streak)],
        [t("clients.longestStreak"), formatNumber(summary.longest_attendance_streak)],
        [t("clients.inactiveWeeks"), formatNumber(summary.consecutive_inactive_weeks)],
        [
            t("clients.memberInactiveWeeks"),
            formatNumber(summary.active_membership_inactive_weeks),
        ],
        [t("clients.trackedPurchases"), formatNumber(summary.tracked_purchase_count)],
        [t("clients.membershipMonths"), formatNumber(summary.membership_months)],
        [t("clients.attendanceRate"), formatPercent(summary.attendance_rate)],
        [t("clients.noShowRate"), formatPercent(summary.no_show_rate)],
        [t("clients.lateCancelRate"), formatPercent(summary.late_cancel_rate)],
        [t("clients.noShows"), formatNumber(summary.no_shows)],
        [t("clients.lateCancels"), formatNumber(summary.late_cancels)],
        [t("clients.totalSpending"), formatMoney(summary.total_spending, t("common.restricted"))],
    ];
    const dates = [
        [t("clients.clientSince"), summary.client_since],
        [t("clients.firstVisit"), summary.first_visit_date],
        [t("clients.lastVisit"), summary.last_visit_date],
        [t("clients.firstPurchase"), summary.first_purchase_date],
        [t("clients.lastPurchase"), summary.last_purchase_date],
    ];
    return (
        <Paper style={{ padding: "18px", display: "grid", gap: "16px" }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <div style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            }}>
                {cards.map(([label, value]) => (
                    <MetricCard key={label} label={label} value={value} />
                ))}
            </div>
            <div style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}>
                {dates.map(([label, value]) => (
                    <div key={label}>
                        <div style={{ color: "#666", fontSize: "13px" }}>{label}</div>
                        <strong>{formatDate(value)}</strong>
                    </div>
                ))}
            </div>
        </Paper>
    );
}


const historyTypeLabel = (value, t) => ({
    attendance: t("clients.history.attendance"),
    purchase: t("clients.history.purchases"),
    membership: t("clients.history.membership"),
}[value] || value);


const outcomeLabel = (value, t) => ({
    attended: t("clients.history.attended"),
    no_show: t("clients.history.noShow"),
    late_cancel: t("clients.history.lateCancel"),
}[value] || value);


const historyDetail = (row, t) => {
    if (row.type === "attendance") {
        return [row.pricing_option, row.staff].filter(Boolean).join(" | ") || "N/A";
    }
    if (row.type === "purchase") {
        return [row.item, ...(row.sale_numbers || [])].filter(Boolean).join(" | ") || "N/A";
    }
    return [statusLabel(row.status, t), row.service].filter(Boolean).join(" | ");
};


function ClientHistory({ clientId, token, backendUrl, authHeaders, t }) {
    const [historyType, setHistoryType] = useState("attendance");
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchHistory = useCallback(async () => {
        if (!token || !clientId) return;
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
            type: historyType,
            page: String(page + 1),
            page_size: String(rowsPerPage),
        });
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/clients/${clientId}/history/?${params.toString()}`,
                authHeaders,
            );
            setRows(response.data.results || []);
            setCount(response.data.count || 0);
        } catch (err) {
            setError(err.response?.data?.detail || t("clients.history.loadError"));
        } finally {
            setLoading(false);
        }
    }, [token, clientId, historyType, page, rowsPerPage, backendUrl, authHeaders, t]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const changeType = (event, value) => {
        setHistoryType(value);
        setPage(0);
    };

    const historyTabs = [
        ["attendance", "clients.history.attendance"],
        ["purchases", "clients.history.purchases"],
        ["membership", "clients.history.membership"],
        ["timeline", "clients.history.timeline"],
    ];

    return (
        <Paper style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 18px 0" }}>
                <h2 style={{ margin: 0 }}>{t("clients.history.title")}</h2>
            </div>
            <Tabs
                value={historyType}
                onChange={changeType}
                variant="scrollable"
                scrollButtons="auto"
                style={{ padding: "0 10px" }}
            >
                {historyTabs.map(([value, key]) => (
                    <Tab key={value} value={value} label={t(key)} />
                ))}
            </Tabs>
            {error && <Alert severity="error">{error}</Alert>}
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t("common.date")}</TableCell>
                            {historyType === "timeline" && (
                                <TableCell>{t("common.type")}</TableCell>
                            )}
                            <TableCell>{t("clients.history.detail")}</TableCell>
                            <TableCell>{t("common.studio")}</TableCell>
                            <TableCell>{t("clients.history.result")}</TableCell>
                            <TableCell align="right">{t("clients.history.amount")}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={historyType === "timeline" ? 6 : 5} align="center">
                                    {t("common.noRecordsFound")}
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((row) => (
                            <TableRow key={`${row.type}-${row.id}`} hover>
                                <TableCell>
                                    <div>{row.date}</div>
                                    {row.time && <small>{row.time}</small>}
                                </TableCell>
                                {historyType === "timeline" && (
                                    <TableCell>{historyTypeLabel(row.type, t)}</TableCell>
                                )}
                                <TableCell>
                                    <div>{historyDetail(row, t)}</div>
                                    {row.activation_date && (
                                        <small>
                                            {t("clients.activationDate")}: {row.activation_date}
                                            {" | "}
                                            {t("clients.expirationDate")}: {row.expiration_date || "N/A"}
                                        </small>
                                    )}
                                </TableCell>
                                <TableCell>{row.studio || t("common.unknown")}</TableCell>
                                <TableCell>
                                    {row.outcome
                                        ? outcomeLabel(row.outcome, t)
                                        : row.status
                                            ? statusLabel(row.status, t)
                                            : row.track_retention
                                                ? t("clients.history.tracked")
                                                : ""}
                                </TableCell>
                                <TableCell align="right">
                                    {row.amount !== undefined
                                        ? formatMoney(row.amount, t("common.restricted"))
                                        : row.revenue !== undefined
                                            ? formatMoney(row.revenue, t("common.restricted"))
                                            : ""}
                                </TableCell>
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
                onPageChange={(event, value) => setPage(value)}
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
            />
        </Paper>
    );
}


export default function ClientProfile() {
    const router = useRouter();
    const token = useFetchToken();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [profile, setProfile] = useState(null);
    const [filters, setFilters] = useState({
        period: "lifetime",
        month: previousMonthValue(),
    });
    const [appliedFilters, setAppliedFilters] = useState(filters);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [periodOptionsOpen, setPeriodOptionsOpen] = useState(false);

    useEffect(() => {
        if (!router.isReady) return;
        const next = {
            period: firstQueryValue(router.query.period) || "lifetime",
            month: firstQueryValue(router.query.month) || previousMonthValue(),
        };
        setFilters(next);
        setAppliedFilters(next);
    }, [router.isReady, router.query.month, router.query.period]);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchProfile = useCallback(async () => {
        if (!token || !router.query.id) return;
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
            period: appliedFilters.period,
            month: appliedFilters.month,
        });
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/clients/${router.query.id}/?${params.toString()}`,
                authHeaders,
            );
            setProfile(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || t("clients.profileLoadError"));
        } finally {
            setLoading(false);
        }
    }, [token, router.query.id, backendUrl, authHeaders, appliedFilters, t]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const applyFilters = (next = filters) => {
        setAppliedFilters(next);
        router.replace({
            pathname: "/clients/[id]",
            query: {
                id: router.query.id,
                period: next.period,
                month: next.month,
                ...(router.query.return_to
                    ? { return_to: firstQueryValue(router.query.return_to) }
                    : {}),
            },
        }, undefined, { shallow: true });
    };

    const changeMonth = (amount) => {
        const next = { ...filters, month: addMonths(filters.month, amount) };
        setFilters(next);
        applyFilters(next);
    };

    const membership = profile?.current_membership;
    const continuity = profile?.membership_continuity;
    const contact = [profile?.client?.email, profile?.client?.phone].filter(Boolean).join(" | ");
    const returnToValue = firstQueryValue(router.query.return_to);
    const validReturnTo = typeof returnToValue === "string" && (
        returnToValue.startsWith("/clients")
        || returnToValue.startsWith("/dashboard/top-clients")
    );
    const returnTo = validReturnTo ? returnToValue : "/clients";
    const returnLabel = returnTo.startsWith("/dashboard/top-clients")
        ? t("clients.backToTopClients")
        : t("clients.backToDirectory");

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {profile?.client?.name || t("clients.title")}</title>
            </Head>
            <div className={styles.container}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(returnTo)}>
                    {returnLabel}
                </Button>
                <div className={styles.titleContainer}>
                    <div>
                        <h1 className={styles.title} style={{ marginBottom: "4px" }}>
                            {profile?.client?.name || t("clients.title")}
                        </h1>
                        {profile?.client && (
                            <div style={{ color: "#666" }}>
                                {profile.client.site} | {profile.client.mindbody_id || "N/A"} |{" "}
                                {contact || t("clients.contactUnavailable")}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ width: "95%", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {profile?.streak_as_of_week && (
                        <div style={{ color: "#666", fontSize: "13px" }}>
                            {t("clients.streakAsOf")}: <strong>{profile.streak_as_of_week}</strong>
                        </div>
                    )}
                    <div>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setPeriodOptionsOpen((open) => !open)}
                        >
                            {periodOptionsOpen
                                ? t("clients.hidePeriodOptions")
                                : `${t("clients.analysisPeriod")}: ${t(
                                    filters.period === "lifetime"
                                        ? "common.lifetime"
                                        : `clients.period.${{
                                            month: "month",
                                            last_3_months: "last3",
                                            last_6_months: "last6",
                                            last_12_months: "last12",
                                        }[filters.period]}`,
                                )}`}
                        </Button>
                    </div>
                    {periodOptionsOpen && (
                        <Paper style={{ padding: "18px", display: "grid", gap: "14px" }}>
                            <div style={{
                                display: "grid",
                                gap: "12px",
                                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                            }}>
                                <TextField
                                    select
                                    size="small"
                                    label={t("clients.analysisPeriod")}
                                    value={filters.period}
                                    onChange={(event) => setFilters((current) => ({
                                        ...current,
                                        period: event.target.value,
                                    }))}
                                >
                                    <MenuItem value="lifetime">{t("common.lifetime")}</MenuItem>
                                    <MenuItem value="month">{t("clients.period.month")}</MenuItem>
                                    <MenuItem value="last_3_months">{t("clients.period.last3")}</MenuItem>
                                    <MenuItem value="last_6_months">{t("clients.period.last6")}</MenuItem>
                                    <MenuItem value="last_12_months">{t("clients.period.last12")}</MenuItem>
                                </TextField>
                                {filters.period !== "lifetime" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <IconButton size="small" onClick={() => changeMonth(-1)}>
                                            <ArrowBackIosNewIcon fontSize="small" />
                                        </IconButton>
                                        <TextField
                                            type="month"
                                            size="small"
                                            label={t("clients.period.endMonth")}
                                            value={filters.month}
                                            onChange={(event) => setFilters((current) => ({
                                                ...current,
                                                month: event.target.value,
                                            }))}
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                        />
                                        <IconButton size="small" onClick={() => changeMonth(1)}>
                                            <ArrowForwardIosIcon fontSize="small" />
                                        </IconButton>
                                    </div>
                                )}
                            </div>
                            <div>
                                <Button variant="contained" onClick={() => applyFilters()} disabled={loading}>
                                    {loading ? t("common.loading") : t("common.apply")}
                                </Button>
                            </div>
                        </Paper>
                    )}

                    <Paper style={{ padding: "18px", display: "grid", gap: "12px" }}>
                        <h2 style={{ margin: 0 }}>{t("clients.currentMembership")}</h2>
                        {!membership ? (
                            <div style={{ color: "#666" }}>{t("clients.noMembershipStatus")}</div>
                        ) : (
                            <div style={{
                                display: "grid",
                                gap: "12px",
                                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                            }}>
                                <MetricCard
                                    label={t("common.status")}
                                    value={statusLabel(membership.status, t)}
                                />
                                <MetricCard
                                    label={t("clients.membershipAsOf")}
                                    value={formatDate(membership.month)}
                                />
                                <MetricCard
                                    label={t("common.studio")}
                                    value={membership.studio || t("common.unknown")}
                                />
                                <MetricCard
                                    label={t("clients.membershipService")}
                                    value={membership.service || "N/A"}
                                />
                                <MetricCard
                                    label={t("clients.saleDate")}
                                    value={formatDate(membership.sale_date)}
                                />
                                <MetricCard
                                    label={t("clients.activationDate")}
                                    value={formatDate(membership.activation_date)}
                                />
                                <MetricCard
                                    label={t("clients.expirationDate")}
                                    value={formatDate(membership.expiration_date)}
                                />
                            </div>
                        )}
                        {continuity && (
                            <div style={{
                                display: "grid",
                                gap: "12px",
                                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                            }}>
                                <MetricCard
                                    label={t("clients.totalMembershipMonths")}
                                    value={formatNumber(continuity.total_membership_months)}
                                />
                                <MetricCard
                                    label={t("clients.currentMembershipStreak")}
                                    value={formatNumber(continuity.current_membership_streak_months)}
                                />
                                <MetricCard
                                    label={t("clients.renewals")}
                                    value={formatNumber(continuity.renewal_count)}
                                />
                                <MetricCard
                                    label={t("clients.reactivations")}
                                    value={formatNumber(continuity.reactivation_count)}
                                />
                                <MetricCard
                                    label={t("clients.notRenewedEvents")}
                                    value={formatNumber(continuity.not_renewed_count)}
                                />
                                <MetricCard
                                    label={t("clients.longestMembershipGap")}
                                    value={formatNumber(continuity.longest_membership_gap_months)}
                                />
                            </div>
                        )}
                    </Paper>

                    <SummaryPanel
                        title={t("clients.selectedPeriod")}
                        summary={profile?.selected_period}
                        t={t}
                    />
                    {profile?.period?.mode !== "lifetime" && (
                        <SummaryPanel
                            title={t("clients.lifetimeSummary")}
                            summary={profile?.lifetime}
                            t={t}
                        />
                    )}
                    <ClientHistory
                        clientId={router.query.id}
                        token={token}
                        backendUrl={backendUrl}
                        authHeaders={authHeaders}
                        t={t}
                    />
                </div>
            </div>
        </MainPage>
    );
}

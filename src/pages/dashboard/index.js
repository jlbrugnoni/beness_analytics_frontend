import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";


const KpiCard = ({ label, value }) => (
    <Paper style={{ padding: "16px", minHeight: "86px" }}>
        <div style={{ color: "#666", fontSize: "13px" }}>{label}</div>
        <div style={{ fontSize: "28px", fontWeight: 700 }}>{value}</div>
    </Paper>
);


const InsightCard = ({ title, value, caption, details = [], action }) => (
    <Paper style={{ padding: "18px", display: "grid", gap: "14px", minHeight: "220px" }}>
        <div>
            <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>{title}</div>
            <div style={{ fontSize: "34px", fontWeight: 800, marginTop: "4px" }}>{value}</div>
            {caption && <div style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>{caption}</div>}
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
            {details.map((detail) => (
                <div
                    key={detail.label}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        borderTop: "1px solid #eef1f4",
                        paddingTop: "8px",
                    }}
                >
                    <span style={{ color: "#666", fontSize: "14px" }}>{detail.label}</span>
                    <strong style={{ fontSize: "14px", textAlign: "right" }}>{detail.value}</strong>
                </div>
            ))}
        </div>
        {action && <div>{action}</div>}
    </Paper>
);


const BreakdownTable = ({ title, rows, nameKey = "name", valueKey = "total", money = false }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Concept</TableCell>
                        <TableCell align="right">Value</TableCell>
                        {rows?.some((row) => row.count !== undefined) && <TableCell align="right">Count</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).slice(0, 10).map((row, index) => (
                        <TableRow key={`${title}-${index}`}>
                            <TableCell>{row[nameKey] ?? "N/A"}</TableCell>
                            <TableCell align="right">{money ? formatMoney(row[valueKey]) : formatNumber(row[valueKey])}</TableCell>
                            {rows?.some((item) => item.count !== undefined) && (
                                <TableCell align="right">{row.count !== undefined ? formatNumber(row.count) : ""}</TableCell>
                            )}
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={3}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const BarChart = ({ title, rows, labelKey = "date", valueKey = "total", money = false, limit = 31 }) => {
    const chartRows = (rows || []).slice(-limit);
    const maxValue = Math.max(...chartRows.map((row) => Number(row[valueKey] || 0)), 0);

    return (
        <Paper style={{ padding: "16px" }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <div style={{ display: "grid", gap: "10px" }}>
                {chartRows.map((row, index) => {
                    const value = Number(row[valueKey] || 0);
                    const width = maxValue ? Math.max(4, (value / maxValue) * 100) : 0;
                    return (
                        <div key={`${title}-${index}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", alignItems: "center", gap: "10px" }}>
                            <div style={{ fontSize: "13px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row[labelKey] || "N/A"}
                            </div>
                            <div style={{ height: "12px", background: "#eef1f4", borderRadius: "6px", overflow: "hidden" }}>
                                <div style={{ width: `${width}%`, height: "100%", background: "#2f6f73" }} />
                            </div>
                            <div style={{ fontSize: "13px", textAlign: "right", fontWeight: 600 }}>
                                {money ? formatMoney(value) : formatNumber(value)}
                            </div>
                        </div>
                    );
                })}
                {!chartRows.length && <div>No data</div>}
            </div>
        </Paper>
    );
};


const RetentionTable = ({ title, rows }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Studio</TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Activity</TableCell>
                        <TableCell align="right">Days</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Purchases</TableCell>
                        <TableCell align="right">Lifetime</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${row.id || index}`}>
                            <TableCell>{row.month || "N/A"}</TableCell>
                            <TableCell>{row.client || "N/A"}</TableCell>
                            <TableCell>{row.studio || "Unknown"}</TableCell>
                            <TableCell>{row.service || "N/A"}</TableCell>
                            <TableCell>{row.status || "N/A"}</TableCell>
                            <TableCell>
                                <div>{formatActivityStatus(row.not_renewed_activity_status)}</div>
                                {!!row.post_expiration_attendance_count && (
                                    <div style={{ color: "#666", fontSize: "12px" }}>
                                        {formatNumber(row.post_expiration_attendance_count)} visits
                                    </div>
                                )}
                            </TableCell>
                            <TableCell align="right">{formatNumber(row.membership_days || row.previous_membership_days)}</TableCell>
                            <TableCell align="right">{formatMoney(row.total_amount)}</TableCell>
                            <TableCell align="right">{formatNumber(row.tracked_membership_purchase_count)}</TableCell>
                            <TableCell align="right">{formatMoney(row.lifetime_membership_value)}</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={10}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const OccupationTable = ({ title, rows, labelKey = "name" }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Concept</TableCell>
                        <TableCell align="right">Capacity</TableCell>
                        <TableCell align="right">Attendance</TableCell>
                        <TableCell align="right">Occupancy</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${index}`}>
                            <TableCell>{row[labelKey] || "N/A"}</TableCell>
                            <TableCell align="right">{formatNumber(row.capacity)}</TableCell>
                            <TableCell align="right">{formatNumber(row.attended)}</TableCell>
                            <TableCell align="right">{formatNumber(row.occupation_rate)}%</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={4}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const OccupancySlotTable = ({ title, rows }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Slot</TableCell>
                        <TableCell>Studio</TableCell>
                        <TableCell align="right">Capacity</TableCell>
                        <TableCell align="right">Attendance</TableCell>
                        <TableCell align="right">Occupancy</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${row.date}-${row.start_time}-${row.studio}-${index}`}>
                            <TableCell>
                                <div>{formatDisplayDate(row.date)}</div>
                                <div style={{ color: "#666", fontSize: "12px" }}>{row.start_time || "N/A"}</div>
                            </TableCell>
                            <TableCell>{row.studio || "N/A"}</TableCell>
                            <TableCell align="right">{formatNumber(row.capacity)}</TableCell>
                            <TableCell align="right">{formatNumber(row.attended)}</TableCell>
                            <TableCell align="right">{formatNumber(row.occupation_rate)}%</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={5}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const InstructorQualityTable = ({ rows }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Instructor Quality</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Instructor</TableCell>
                        <TableCell align="right">Visits</TableCell>
                        <TableCell align="right">Attended</TableCell>
                        <TableCell align="right">No-show</TableCell>
                        <TableCell align="right">Late Cancel</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`instructor-quality-${index}`}>
                            <TableCell>{row.name || "N/A"}</TableCell>
                            <TableCell align="right">{formatNumber(row.total)}</TableCell>
                            <TableCell align="right">{formatNumber(row.attended)}</TableCell>
                            <TableCell align="right">{formatNumber(row.no_show_rate)}%</TableCell>
                            <TableCell align="right">{formatNumber(row.late_cancel_rate)}%</TableCell>
                            <TableCell align="right">{formatMoney(row.revenue)}</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={6}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatMoney = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPercent = (value) => `${formatNumber(value)}%`;
const formatActivityStatus = (value) => ({
    inactive: "Inactive",
    attending_unpaid: "Attending Unpaid",
    attending_paid: "Attending Paid",
}[value] || "N/A");


const monthOptions = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];


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


const formatDateValue = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


const monthRange = (monthValue) => {
    const [year, month] = monthValue.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
        date_from: `${monthValue}-01`,
        date_to: `${monthValue}-${String(lastDay).padStart(2, "0")}`,
    };
};


const weekRange = (value = new Date()) => {
    const dateValue = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const weekday = dateValue.getDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    const start = new Date(dateValue);
    start.setDate(dateValue.getDate() - daysFromMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
        date_from: formatDateValue(start),
        date_to: formatDateValue(end),
    };
};


const previousWeekRange = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return weekRange(today);
};


const weekRangeFromDate = (value) => {
    if (!value) return weekRange();
    const [year, month, day] = value.split("-").map(Number);
    return weekRange(new Date(year, month - 1, day));
};


const selectedDateRange = (dashboardMode, periodModes, filters) => {
    const periodMode = periodModes[dashboardMode];
    if (dashboardMode === "weekly") {
        if (periodMode === "current_week") return weekRange();
        if (periodMode === "previous_week") return previousWeekRange();
        if (periodMode === "specific_week") return weekRangeFromDate(filters.week_date);
        return { date_from: filters.date_from, date_to: filters.date_to };
    }
    if (periodMode === "last_completed_month") return monthRange(lastCompletedMonthValue());
    if (periodMode === "current_month") return monthRange(currentMonthValue());
    if (periodMode === "specific_month") return monthRange(filters.month);
    return monthRange(lastCompletedMonthValue());
};


const formatDisplayDate = (value) => {
    if (!value) return "N/A";
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};


const dashboardModes = {
    monthly: {
        title: "Monthly Performance",
        defaultTab: "monthly_overview",
    },
    weekly: {
        title: "Weekly Operations",
        defaultTab: "weekly_overview",
    },
};


const dashboardTabs = {
    monthly: [
        { label: "Summary", value: "monthly_overview" },
        { label: "Revenue", value: "revenue" },
        { label: "Retention", value: "retention" },
    ],
    weekly: [
        { label: "Summary", value: "weekly_overview" },
        { label: "Attendance", value: "attendance" },
        { label: "Occupancy", value: "occupancy" },
    ],
};


export default function Dashboard() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const defaultMonth = lastCompletedMonthValue();
    const defaultWeek = weekRange();

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [periodModes, setPeriodModes] = useState({
        monthly: "last_completed_month",
        weekly: "current_week",
    });
    const [filters, setFilters] = useState({
        site: "",
        studio: "",
        month: defaultMonth,
        week_date: defaultWeek.date_from,
        date_from: defaultWeek.date_from,
        date_to: defaultWeek.date_to,
    });
    const [summary, setSummary] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [retention, setRetention] = useState(null);
    const [occupation, setOccupation] = useState(null);
    const [dashboardMode, setDashboardMode] = useState("monthly");
    const [activeTab, setActiveTab] = useState("monthly_overview");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
            url = response.data.next || null;
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
            const dateFilters = selectedDateRange(dashboardMode, periodModes, filters);
            const requestFilters = {
                site: filters.site,
                studio: filters.studio,
                ...dateFilters,
            };
            Object.entries(requestFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const queryString = params.toString();
            const [summaryResponse, revenueResponse, attendanceResponse, retentionResponse, occupationResponse] = await Promise.all([
                axios.get(`${backendUrl}/api/data/analytics/summary/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/revenue/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/attendance/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/retention/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/occupation/?${queryString}`, authHeaders),
            ]);
            setSummary(summaryResponse.data);
            setRevenue(revenueResponse.data);
            setAttendance(attendanceResponse.data);
            setRetention(retentionResponse.data);
            setOccupation(occupationResponse.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchDashboard();
    }, [token, dashboardMode]);

    const totals = summary?.totals || {};
    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const activePeriodMode = periodModes[dashboardMode];
    const activeDateRange = selectedDateRange(dashboardMode, periodModes, filters);
    const selectedMonthParts = monthParts(filters.month);
    const activeDashboardTabs = dashboardTabs[dashboardMode];
    const occupancySlots = occupation?.by_slot || [];
    const lowOccupancySlots = [...occupancySlots]
        .filter((row) => Number(row.capacity || 0) > 0)
        .sort((a, b) => Number(a.occupation_rate || 0) - Number(b.occupation_rate || 0))
        .slice(0, 10);
    const highOccupancySlots = [...occupancySlots]
        .filter((row) => Number(row.capacity || 0) > 0)
        .sort((a, b) => Number(b.occupation_rate || 0) - Number(a.occupation_rate || 0))
        .slice(0, 10);

    const handleDashboardModeChange = (_, value) => {
        if (!value) return;
        setDashboardMode(value);
        setActiveTab(dashboardModes[value].defaultTab);
    };

    const handlePeriodModeChange = (event) => {
        setPeriodModes({
            ...periodModes,
            [dashboardMode]: event.target.value,
        });
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Dashboard</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Dashboard</h1>
                </div>

                <div style={{ width: "90%", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper style={{ padding: "0 12px" }}>
                        <Tabs
                            value={dashboardMode}
                            onChange={handleDashboardModeChange}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab label="Monthly Performance" value="monthly" />
                            <Tab label="Weekly Operations" value="weekly" />
                        </Tabs>
                    </Paper>

                    <Paper style={{ padding: "16px", display: "grid", gap: "12px" }}>
                        <div>
                            <h2 style={{ margin: 0 }}>{dashboardModes[dashboardMode].title}</h2>
                        </div>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                            <TextField
                                select
                                label="Site"
                                value={filters.site}
                                onChange={(event) => setFilters({ ...filters, site: event.target.value, studio: "" })}
                            >
                                <MenuItem value="">All Sites</MenuItem>
                                {sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label="Studio"
                                value={filters.studio}
                                onChange={(event) => setFilters({ ...filters, studio: event.target.value })}
                            >
                                <MenuItem value="">All Studios</MenuItem>
                                {visibleStudios.map((studio) => (
                                    <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label="Period"
                                value={activePeriodMode}
                                onChange={handlePeriodModeChange}
                            >
                                {dashboardMode === "monthly" ? (
                                    [
                                        <MenuItem key="last_completed_month" value="last_completed_month">Last Completed Month</MenuItem>,
                                        <MenuItem key="current_month" value="current_month">Current Month</MenuItem>,
                                        <MenuItem key="specific_month" value="specific_month">Specific Month</MenuItem>,
                                    ]
                                ) : (
                                    [
                                        <MenuItem key="current_week" value="current_week">Current Week</MenuItem>,
                                        <MenuItem key="previous_week" value="previous_week">Previous Week</MenuItem>,
                                        <MenuItem key="specific_week" value="specific_week">Specific Week</MenuItem>,
                                        <MenuItem key="range" value="range">Custom Range</MenuItem>,
                                    ]
                                )}
                            </TextField>
                            {dashboardMode === "monthly" && activePeriodMode === "specific_month" && (
                                <>
                                    <TextField
                                        select
                                        label="Month"
                                        value={selectedMonthParts.month}
                                        onChange={(event) => setFilters({
                                            ...filters,
                                            month: buildMonthValue(selectedMonthParts.year, event.target.value),
                                        })}
                                    >
                                        {monthOptions.map((month) => (
                                            <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        label="Year"
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
                            {dashboardMode === "weekly" && activePeriodMode === "specific_week" && (
                                <TextField
                                    label="Week Of"
                                    type="date"
                                    value={filters.week_date}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(event) => setFilters({ ...filters, week_date: event.target.value })}
                                />
                            )}
                            {dashboardMode === "weekly" && activePeriodMode === "range" && (
                                <>
                                    <TextField
                                        label="Date From"
                                        type="date"
                                        value={filters.date_from}
                                        InputLabelProps={{ shrink: true }}
                                        onChange={(event) => setFilters({ ...filters, date_from: event.target.value })}
                                    />
                                    <TextField
                                        label="Date To"
                                        type="date"
                                        value={filters.date_to}
                                        InputLabelProps={{ shrink: true }}
                                        onChange={(event) => setFilters({ ...filters, date_to: event.target.value })}
                                    />
                                </>
                            )}
                        </div>
                        <div style={{ color: "#666", fontSize: "14px" }}>
                            Showing: {formatDisplayDate(activeDateRange.date_from)} - {formatDisplayDate(activeDateRange.date_to)}
                        </div>
                        <div>
                            <Button variant="contained" onClick={fetchDashboard} disabled={loading}>
                                {loading ? "Loading..." : "Apply Filters"}
                            </Button>
                        </div>
                    </Paper>

                    {filters.studio && (
                        <Alert severity="info">
                            Studio filter applies to attendance, sales, occupancy, and monthly retention snapshots.
                            Service-purchase metrics are hidden until they can be reliably attributed by studio.
                        </Alert>
                    )}

                    <Paper style={{ padding: "0 12px" }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, value) => setActiveTab(value)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {activeDashboardTabs.map((tab) => (
                                <Tab key={tab.value} label={tab.label} value={tab.value} />
                            ))}
                        </Tabs>
                    </Paper>

                    {activeTab === "monthly_overview" && (
                        <>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                                <InsightCard
                                    title="Revenue Health"
                                    value={formatMoney(totals.sales_revenue)}
                                    caption="Sales revenue for the selected month."
                                    details={[
                                        { label: "Visit revenue", value: formatMoney(totals.visit_revenue) },
                                        { label: "Average ticket", value: formatMoney(totals.average_ticket) },
                                        { label: "Sales by studio", value: formatNumber(revenue?.by_studio?.length) },
                                    ]}
                                />
                                <InsightCard
                                    title="Retention Health"
                                    value={formatPercent(retention?.renewal_rate)}
                                    caption="Renewal rate from monthly membership snapshots."
                                    details={[
                                        { label: "Churn rate", value: formatPercent(retention?.churn_rate) },
                                        { label: "Retained members", value: formatNumber(retention?.retained_members) },
                                        { label: "Current members", value: formatNumber(retention?.current_month_members) },
                                    ]}
                                    action={(
                                        <Link href="/retention">
                                            <Button variant="outlined" size="small">Open Retention Follow-up</Button>
                                        </Link>
                                    )}
                                />
                                <InsightCard
                                    title="Follow-up Focus"
                                    value={formatNumber(retention?.not_renewed_members ?? retention?.not_renewed_services)}
                                    caption="Members who did not renew in the selected month."
                                    details={[
                                        { label: "Value at risk", value: formatMoney(retention?.not_renewed_value) },
                                        { label: "Attending unpaid", value: formatNumber(retention?.not_renewed_attending_unpaid) },
                                        { label: "Attending paid", value: formatNumber(retention?.not_renewed_attending_paid) },
                                    ]}
                                />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                                <BarChart title="Sales Revenue Trend" rows={revenue?.sales_by_date} money />
                                <BreakdownTable title="Revenue by Studio" rows={revenue?.by_studio} money />
                            </div>
                        </>
                    )}

                    {activeTab === "weekly_overview" && (
                        <>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                                <InsightCard
                                    title="Attendance Health"
                                    value={formatNumber(totals.attended_visits)}
                                    caption="Attended visits for the selected week."
                                    details={[
                                        { label: "Total reservations", value: formatNumber(totals.attendance_visits) },
                                        { label: "No-show rate", value: formatPercent(totals.no_show_rate) },
                                        { label: "Late cancel rate", value: formatPercent(totals.late_cancel_rate) },
                                    ]}
                                />
                                <InsightCard
                                    title="Occupancy Health"
                                    value={formatPercent(occupation?.occupation_rate)}
                                    caption="Matched attendance divided by scheduled capacity."
                                    details={[
                                        { label: "Matched attendance", value: formatNumber(occupation?.matched_attended_visits) },
                                        { label: "Scheduled capacity", value: formatNumber(occupation?.scheduled_capacity) },
                                        { label: "Scheduled classes", value: formatNumber(occupation?.available_classes) },
                                    ]}
                                />
                                <InsightCard
                                    title="Schedule Watch"
                                    value={formatNumber(occupation?.unscheduled_attended_visits)}
                                    caption="Attended visits not matched to a scheduled class."
                                    details={[
                                        { label: "Closed / unavailable", value: formatNumber(occupation?.closed_or_unavailable_classes) },
                                        { label: "Active clients", value: formatNumber(totals.active_clients) },
                                        { label: "Slot rows", value: formatNumber(occupancySlots.length) },
                                    ]}
                                />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                                <BarChart title="Attendance Trend" rows={attendance?.by_date} />
                                <OccupationTable title="Occupancy by Day" rows={occupation?.by_day} labelKey="date" />
                                <OccupationTable title="Occupancy by Studio" rows={occupation?.by_studio} />
                            </div>
                        </>
                    )}

                    {activeTab === "revenue" && (
                        <>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <KpiCard label="Sales Revenue" value={formatMoney(totals.sales_revenue)} />
                                <KpiCard label="Visit Revenue" value={formatMoney(totals.visit_revenue)} />
                                <KpiCard label="Average Ticket" value={formatMoney(totals.average_ticket)} />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                                <BarChart title="Sales Revenue by Date" rows={revenue?.sales_by_date} money />
                                <BreakdownTable title="Visit Revenue by Weekday" rows={revenue?.visits_by_weekday} nameKey="weekday" money />
                                <BreakdownTable title="Revenue by Studio" rows={revenue?.by_studio} money />
                                <BreakdownTable title="Revenue by Item" rows={revenue?.by_item} money />
                                <BreakdownTable title="Discounts" rows={[
                                    { name: "Discounts", total: revenue?.discounts || 0 },
                                    { name: "Taxes", total: revenue?.taxes || 0 },
                                ]} money />
                            </div>
                        </>
                    )}

                    {activeTab === "attendance" && (
                        <>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <KpiCard label="Attendance Visits" value={formatNumber(totals.attendance_visits)} />
                                <KpiCard label="Attended Visits" value={formatNumber(totals.attended_visits)} />
                                <KpiCard label="Avg Revenue / Visit" value={formatMoney(totals.average_revenue_per_attended_visit)} />
                                <KpiCard label="No-show Rate" value={`${formatNumber(totals.no_show_rate)}%`} />
                                <KpiCard label="Late Cancel Rate" value={`${formatNumber(totals.late_cancel_rate)}%`} />
                                <KpiCard label="Active Clients" value={formatNumber(totals.active_clients)} />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                                <BarChart title="Attendance by Date" rows={attendance?.by_date} />
                                <BarChart title="Attendance by Hour" rows={attendance?.by_hour} labelKey="hour" limit={24} />
                                <BreakdownTable title="Attendance by Weekday" rows={attendance?.by_weekday} nameKey="weekday" />
                                <BreakdownTable title="Attendance by Studio" rows={attendance?.by_studio} />
                                <BreakdownTable title="Attendance by Instructor" rows={attendance?.by_instructor} />
                                <BreakdownTable title="Attendance by Service" rows={attendance?.by_service} />
                                <BreakdownTable title="Attendance by Hour" rows={attendance?.by_hour} nameKey="hour" />
                                <InstructorQualityTable rows={attendance?.instructor_quality} />
                            </div>
                        </>
                    )}

                    {activeTab === "retention" && (
                        <>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <KpiCard label="Previous Members" value={formatNumber(retention?.previous_month_members)} />
                                <KpiCard label="Current Members" value={formatNumber(retention?.current_month_members)} />
                                <KpiCard label="Retained Members" value={formatNumber(retention?.retained_members)} />
                                <KpiCard label="New Members" value={formatNumber(retention?.new_members)} />
                                <KpiCard label="Reactivated Members" value={formatNumber(retention?.reactivated_members)} />
                                <KpiCard label="Not Renewed Members" value={formatNumber(retention?.not_renewed_members ?? retention?.not_renewed_services)} />
                                <KpiCard label="Not Renewed Inactive" value={formatNumber(retention?.not_renewed_inactive)} />
                                <KpiCard label="Not Renewed Attending Unpaid" value={formatNumber(retention?.not_renewed_attending_unpaid)} />
                                <KpiCard label="Not Renewed Attending Paid" value={formatNumber(retention?.not_renewed_attending_paid)} />
                                <KpiCard label="Post-expiration Attendance" value={formatNumber(retention?.not_renewed_post_expiration_attendance)} />
                                <KpiCard label="Renewal Rate" value={`${formatNumber(retention?.renewal_rate)}%`} />
                                <KpiCard label="Churn Rate" value={`${formatNumber(retention?.churn_rate)}%`} />
                                <KpiCard label="Not Renewed Value" value={formatMoney(retention?.not_renewed_value)} />
                                <KpiCard label="Tracked Products" value={formatNumber(retention?.tracked_pricing_options)} />
                                <KpiCard label="Snapshot Rows" value={formatNumber(retention?.snapshot_rows)} />
                            </div>

                            {retention?.tracked_pricing_options === 0 && (
                                <Alert severity="warning">
                                    No hay productos marcados para analizar retencion. Marca las membresias en Data &gt; Pricing Options.
                                </Alert>
                            )}
                            {retention?.snapshot_rows === 0 && (
                                <Alert severity="warning">
                                    No hay snapshots mensuales para este periodo. Abre Retention Follow-up y reconstruye el mes.
                                </Alert>
                            )}

                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
                                <RetentionTable title="Not Renewed Clients" rows={retention?.not_renewed_clients} />
                                <RetentionTable title="Retained Samples" rows={retention?.retained_samples} />
                                <RetentionTable title="New Member Samples" rows={retention?.new_member_samples} />
                                <RetentionTable title="Reactivated Samples" rows={retention?.reactivated_samples} />
                            </div>

                            <div>
                                <Link href="/retention">
                                    <Button variant="outlined">Open Retention Follow-up</Button>
                                </Link>
                            </div>
                        </>
                    )}

                    {activeTab === "occupancy" && (
                        <>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <KpiCard label="Scheduled Capacity" value={formatNumber(occupation?.scheduled_capacity)} />
                                <KpiCard label="Matched Attendance" value={formatNumber(occupation?.matched_attended_visits)} />
                                <KpiCard label="Occupancy Rate" value={`${formatNumber(occupation?.occupation_rate)}%`} />
                                <KpiCard label="Scheduled Classes" value={formatNumber(occupation?.available_classes)} />
                                <KpiCard label="Closed / Unavailable" value={formatNumber(occupation?.closed_or_unavailable_classes)} />
                                <KpiCard label="Unscheduled Attendance" value={formatNumber(occupation?.unscheduled_attended_visits)} />
                            </div>

                            <Alert severity="info">
                                La ocupacion se calcula con clases programadas y asistencias emparejadas por site, estudio, fecha y hora.
                                Para empezar, crea salas y clases en Data &gt; Rooms, Scheduled Classes y Closures.
                            </Alert>

                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                                <OccupationTable title="Occupancy by Studio" rows={occupation?.by_studio} />
                                <OccupationTable title="Occupancy by Day" rows={occupation?.by_day} labelKey="date" />
                                <OccupationTable title="Occupancy by Room" rows={occupation?.by_room_capacity} />
                                <OccupancySlotTable title="Lowest Occupancy Slots" rows={lowOccupancySlots} />
                                <OccupancySlotTable title="Highest Occupancy Slots" rows={highOccupancySlots} />
                            </div>

                            <Alert severity="info">
                                La ocupacion por sala sera mas exacta cuando las asistencias puedan emparejarse con una sala especifica.
                            </Alert>
                        </>
                    )}
                </div>
            </div>
        </MainPage>
    );
}

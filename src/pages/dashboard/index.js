import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";


const KpiCard = ({ label, value }) => (
    <Paper style={{ padding: "16px", minHeight: "86px" }}>
        <div style={{ color: "#666", fontSize: "13px" }}>{label}</div>
        <div style={{ fontSize: "28px", fontWeight: 700 }}>{value}</div>
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


const RetentionTable = ({ title, rows, mode = "expired" }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Client</TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell>Expiration</TableCell>
                        {mode === "upcoming" && <TableCell align="right">Days Left</TableCell>}
                        {mode === "renewed" && <TableCell>Renewal</TableCell>}
                        {mode === "renewed" && <TableCell align="right">Days</TableCell>}
                        <TableCell align="right">Amount</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${row.client_id || index}-${row.expiration_date || index}`}>
                            <TableCell>{row.client || "N/A"}</TableCell>
                            <TableCell>{row.service || "N/A"}</TableCell>
                            <TableCell>{row.expiration_date || "N/A"}</TableCell>
                            {mode === "upcoming" && <TableCell align="right">{formatNumber(row.days_until_expiration)}</TableCell>}
                            {mode === "renewed" && (
                                <TableCell>
                                    {row.renewal_service || "N/A"}
                                    {row.renewal_sale_date ? ` (${row.renewal_sale_date})` : ""}
                                </TableCell>
                            )}
                            {mode === "renewed" && (
                                <TableCell align="right">{formatSignedNumber(row.days_from_expiration_to_renewal)}</TableCell>
                            )}
                            <TableCell align="right">{formatMoney(row.total_amount)}</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={mode === "expired" ? 4 : 6}>No data</TableCell>
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
const formatSignedNumber = (value) => {
    if (value === null || value === undefined) return "N/A";
    const number = Number(value);
    return number > 0 ? `+${formatNumber(number)}` : formatNumber(number);
};


export default function Dashboard() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [sites, setSites] = useState([]);
    const [filters, setFilters] = useState({ site: "", date_from: monthAgo, date_to: today });
    const [summary, setSummary] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [retention, setRetention] = useState(null);
    const [occupation, setOccupation] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchSites = async () => {
        if (!token) return;
        const response = await axios.get(`${backendUrl}/api/data/sites/`, authHeaders);
        setSites(response.data.results || response.data);
    };

    const fetchDashboard = async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
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
        fetchSites().catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchDashboard();
    }, [token]);

    const totals = summary?.totals || {};

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

                    <Paper style={{ padding: "16px", display: "grid", gap: "12px" }}>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                            <TextField
                                select
                                label="Site"
                                value={filters.site}
                                onChange={(event) => setFilters({ ...filters, site: event.target.value })}
                            >
                                <MenuItem value="">All Sites</MenuItem>
                                {sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
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
                        </div>
                        <div>
                            <Button variant="contained" onClick={fetchDashboard} disabled={loading}>
                                {loading ? "Loading..." : "Apply Filters"}
                            </Button>
                        </div>
                    </Paper>

                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <KpiCard label="Sales Revenue" value={formatMoney(totals.sales_revenue)} />
                        <KpiCard label="Service Revenue" value={formatMoney(totals.service_revenue)} />
                        <KpiCard label="Visit Revenue" value={formatMoney(totals.visit_revenue)} />
                        <KpiCard label="Average Ticket" value={formatMoney(totals.average_ticket)} />
                        <KpiCard label="Attendance Visits" value={formatNumber(totals.attendance_visits)} />
                        <KpiCard label="Attended Visits" value={formatNumber(totals.attended_visits)} />
                        <KpiCard label="Avg Revenue / Visit" value={formatMoney(totals.average_revenue_per_attended_visit)} />
                        <KpiCard label="No-show Rate" value={`${formatNumber(totals.no_show_rate)}%`} />
                        <KpiCard label="Late Cancel Rate" value={`${formatNumber(totals.late_cancel_rate)}%`} />
                        <KpiCard label="Active Clients" value={formatNumber(totals.active_clients)} />
                        <KpiCard label="Service Purchases" value={formatNumber(totals.service_purchases)} />
                    </div>

                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <KpiCard label="Expired Services" value={formatNumber(retention?.expired_services)} />
                        <KpiCard label="Renewed / Reactivated" value={formatNumber(retention?.renewed_or_reactivated_services)} />
                        <KpiCard label="Not Renewed" value={formatNumber(retention?.not_renewed_services)} />
                        <KpiCard label="Renewal Rate" value={`${formatNumber(retention?.renewal_rate)}%`} />
                        <KpiCard label="Not Renewed Value" value={formatMoney(retention?.not_renewed_value)} />
                        <KpiCard label="Expiring Next 30 Days" value={formatNumber(retention?.upcoming_expirations_30_days)} />
                        <KpiCard label="Tracked Products" value={formatNumber(retention?.tracked_pricing_options)} />
                    </div>

                    {retention?.tracked_pricing_options === 0 && (
                        <Alert severity="warning">
                            No hay productos marcados para analizar retencion. Marca las membresias en Data &gt; Pricing Options.
                        </Alert>
                    )}

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

                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                        <BreakdownTable title="Revenue by Weekday" rows={revenue?.sales_by_weekday} nameKey="weekday" money />
                        <BreakdownTable title="Services by Weekday" rows={revenue?.services_by_weekday} nameKey="weekday" money />
                        <BreakdownTable title="Visit Revenue by Weekday" rows={revenue?.visits_by_weekday} nameKey="weekday" money />
                        <BreakdownTable title="Revenue by Studio" rows={revenue?.by_studio} money />
                        <BreakdownTable title="Revenue by Payment Method" rows={revenue?.by_payment_method} money />
                        <BreakdownTable title="Revenue by Item" rows={revenue?.by_item} money />
                        <BreakdownTable title="Revenue by Service" rows={revenue?.by_service} money />
                        <BreakdownTable title="Attendance by Weekday" rows={attendance?.by_weekday} nameKey="weekday" />
                        <BreakdownTable title="Attendance by Studio" rows={attendance?.by_studio} />
                        <BreakdownTable title="Attendance by Instructor" rows={attendance?.by_instructor} />
                        <BreakdownTable title="Attendance by Service" rows={attendance?.by_service} />
                        <BreakdownTable title="Attendance by Hour" rows={attendance?.by_hour} nameKey="hour" />
                        <BreakdownTable title="Discounts" rows={[
                            { name: "Discounts", total: revenue?.discounts || 0 },
                            { name: "Taxes", total: revenue?.taxes || 0 },
                        ]} money />
                        <InstructorQualityTable rows={attendance?.instructor_quality} />
                    </div>

                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
                        <RetentionTable title="Not Renewed Clients" rows={retention?.not_renewed_clients} />
                        <RetentionTable title="Upcoming Expirations" rows={retention?.upcoming_expirations} mode="upcoming" />
                        <RetentionTable title="Renewed / Reactivated Samples" rows={retention?.renewed_samples} mode="renewed" />
                    </div>

                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                        <OccupationTable title="Occupancy by Studio" rows={occupation?.by_studio} />
                        <OccupationTable title="Occupancy by Day" rows={occupation?.by_day} labelKey="date" />
                    </div>

                    <Alert severity="info">
                        Este dashboard es la primera base de KPIs. La ocupacion por sala sera mas exacta cuando las
                        asistencias puedan emparejarse con una sala especifica.
                    </Alert>
                </div>
            </div>
        </MainPage>
    );
}

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


const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatMoney = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });


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
            const [summaryResponse, revenueResponse, attendanceResponse] = await Promise.all([
                axios.get(`${backendUrl}/api/data/analytics/summary/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/revenue/?${queryString}`, authHeaders),
                axios.get(`${backendUrl}/api/data/analytics/attendance/?${queryString}`, authHeaders),
            ]);
            setSummary(summaryResponse.data);
            setRevenue(revenueResponse.data);
            setAttendance(attendanceResponse.data);
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
                        <KpiCard label="Attendance Visits" value={formatNumber(totals.attendance_visits)} />
                        <KpiCard label="Attended Visits" value={formatNumber(totals.attended_visits)} />
                        <KpiCard label="No-show Rate" value={`${formatNumber(totals.no_show_rate)}%`} />
                        <KpiCard label="Late Cancel Rate" value={`${formatNumber(totals.late_cancel_rate)}%`} />
                        <KpiCard label="Active Clients" value={formatNumber(totals.active_clients)} />
                        <KpiCard label="Service Purchases" value={formatNumber(totals.service_purchases)} />
                    </div>

                    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                        <BreakdownTable title="Revenue by Studio" rows={revenue?.by_studio} money />
                        <BreakdownTable title="Revenue by Payment Method" rows={revenue?.by_payment_method} money />
                        <BreakdownTable title="Revenue by Service" rows={revenue?.by_service} money />
                        <BreakdownTable title="Attendance by Studio" rows={attendance?.by_studio} />
                        <BreakdownTable title="Attendance by Instructor" rows={attendance?.by_instructor} />
                        <BreakdownTable title="Attendance by Service" rows={attendance?.by_service} />
                        <BreakdownTable title="Attendance by Hour" rows={attendance?.by_hour} nameKey="hour" />
                    </div>

                    <Alert severity="info">
                        Este dashboard es la primera base de KPIs. La ocupacion real se agregara cuando carguemos salas,
                        capacidades y horarios programados.
                    </Alert>
                </div>
            </div>
        </MainPage>
    );
}

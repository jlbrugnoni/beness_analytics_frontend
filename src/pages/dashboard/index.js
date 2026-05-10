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
import TextField from "@mui/material/TextField";


const KpiCard = ({ label, value }) => (
    <Paper style={{ padding: "16px", minHeight: "86px" }}>
        <div style={{ color: "#666", fontSize: "13px" }}>{label}</div>
        <div style={{ fontSize: "28px", fontWeight: 700 }}>{value}</div>
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

    const fetchSummary = async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await axios.get(`${backendUrl}/api/data/analytics/summary/?${params.toString()}`, authHeaders);
            setSummary(response.data);
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
        fetchSummary();
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
                            <Button variant="contained" onClick={fetchSummary} disabled={loading}>
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

                    <Alert severity="info">
                        Este dashboard es la primera base de KPIs. La ocupacion real se agregara cuando carguemos salas,
                        capacidades y horarios programados.
                    </Alert>
                </div>
            </div>
        </MainPage>
    );
}

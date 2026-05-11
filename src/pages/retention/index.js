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


const formatMoney = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });


const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;


const lastCompletedMonthValue = () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = previousMonth.getFullYear();
    const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};


const monthRange = (monthValue) => {
    const [year, month] = monthValue.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
        date_from: `${monthValue}-01`,
        date_to: `${monthValue}-${String(lastDay).padStart(2, "0")}`,
    };
};


export default function RetentionFollowUp() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const defaultMonth = lastCompletedMonthValue();

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [periodMode, setPeriodMode] = useState("month");
    const [filters, setFilters] = useState({
        site: "",
        studio: "",
        month: defaultMonth,
        date_from: monthRange(defaultMonth).date_from,
        date_to: monthRange(defaultMonth).date_to,
        status: "not_renewed",
        search: "",
    });
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
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

    const fetchRows = async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            const dateFilters = periodMode === "month"
                ? monthRange(filters.month)
                : { date_from: filters.date_from, date_to: filters.date_to };
            const requestFilters = {
                site: filters.site,
                studio: filters.studio,
                status: filters.status,
                search: filters.search,
                ...dateFilters,
            };
            Object.entries(requestFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await axios.get(`${backendUrl}/api/data/analytics/retention-followup/?${params.toString()}`, authHeaders);
            setRows(response.data.rows || []);
            setCount(response.data.count || 0);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading retention follow-up.");
        } finally {
            setLoading(false);
        }
    };

    const exportCsv = () => {
        const dateFilters = periodMode === "month"
            ? monthRange(filters.month)
            : { date_from: filters.date_from, date_to: filters.date_to };
        const headers = [
            "Month",
            "Status",
            "Client",
            "MindBody ID",
            "Email",
            "Phone",
            "Studio",
            "Service",
            "Sale Date",
            "Activation Date",
            "Expiration Date",
            "Membership Days",
            "Previous Membership Days",
            "Amount",
            "Studio Inference",
        ];
        const lines = rows.map((row) => [
            row.month,
            row.status,
            row.client,
            row.client_mindbody_id,
            row.client_email,
            row.client_phone,
            row.studio,
            row.service,
            row.sale_date,
            row.activation_date,
            row.expiration_date,
            row.membership_days,
            row.previous_membership_days,
            row.total_amount,
            row.studio_inference_method,
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
        if (!window.confirm("Rebuild monthly membership snapshots for the selected site and period?")) return;
        setLoading(true);
        setError("");
        try {
            const dateFilters = periodMode === "month"
                ? monthRange(filters.month)
                : { date_from: filters.date_from, date_to: filters.date_to };
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

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchRows();
    }, [token]);

    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Retention</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Retention Follow-up</h1>
                </div>

                <div style={{ width: "90%", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper style={{ padding: "16px", display: "grid", gap: "12px" }}>
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
                                label="Status"
                                value={filters.status}
                                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                            >
                                <MenuItem value="not_renewed">Not Renewed</MenuItem>
                                <MenuItem value="retained">Retained</MenuItem>
                                <MenuItem value="new">New</MenuItem>
                                <MenuItem value="reactivated">Reactivated</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label="Period"
                                value={periodMode}
                                onChange={(event) => setPeriodMode(event.target.value)}
                            />
                            {periodMode === "month" ? (
                                <TextField
                                    label="Month"
                                    type="month"
                                    value={filters.month}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(event) => setFilters({ ...filters, month: event.target.value })}
                                />
                            ) : (
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
                            <TextField
                                label="Search"
                                value={filters.search}
                                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <Button variant="contained" onClick={fetchRows} disabled={loading}>
                                {loading ? "Loading..." : "Apply Filters"}
                            </Button>
                            <Button variant="outlined" onClick={rebuildSnapshots} disabled={loading}>
                                Rebuild Month
                            </Button>
                            <Button variant="outlined" onClick={exportCsv} disabled={!rows.length}>
                                Export CSV
                            </Button>
                        </div>
                    </Paper>

                    <Alert severity="info">
                        This list uses only Pricing Options marked as Track Retention. Records are based on services
                        with at least 15 active membership days in the selected month. Not renewed is counted in the
                        month where the client stopped being a member.
                    </Alert>

                    <Paper style={{ padding: "16px" }}>
                        <h2 style={{ marginTop: 0 }}>{count.toLocaleString()} records</h2>
                        <TableContainer style={{ maxHeight: 620 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Client</TableCell>
                                        <TableCell>Contact</TableCell>
                                        <TableCell>Month</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Studio</TableCell>
                                        <TableCell>Service</TableCell>
                                        <TableCell align="right">Days</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, index) => (
                                        <TableRow key={`${row.client_id}-${row.expiration_date}-${index}`}>
                                            <TableCell>
                                                <div>{row.client || "N/A"}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>{row.client_mindbody_id || ""}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div>{row.client_email || "N/A"}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>{row.client_phone || ""}</div>
                                            </TableCell>
                                            <TableCell>{row.month || "N/A"}</TableCell>
                                            <TableCell>{row.status || "N/A"}</TableCell>
                                            <TableCell>
                                                <div>{row.studio || "Unknown"}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>{row.studio_inference_method || ""}</div>
                                            </TableCell>
                                            <TableCell>{row.service || "N/A"}</TableCell>
                                            <TableCell align="right">{row.membership_days || row.previous_membership_days || "N/A"}</TableCell>
                                            <TableCell align="right">{formatMoney(row.total_amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!rows.length && (
                                        <TableRow>
                                            <TableCell colSpan={8}>No data</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </div>
            </div>
        </MainPage>
    );
}

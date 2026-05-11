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


export default function RetentionFollowUp() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const today = new Date().toISOString().slice(0, 10);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [sites, setSites] = useState([]);
    const [filters, setFilters] = useState({
        site: "",
        date_from: threeMonthsAgo,
        date_to: today,
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

    const fetchSites = async () => {
        if (!token) return;
        const response = await axios.get(`${backendUrl}/api/data/sites/`, authHeaders);
        setSites(response.data.results || response.data);
    };

    const fetchRows = async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
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
        const headers = [
            "Client",
            "MindBody ID",
            "Email",
            "Phone",
            "Service",
            "Sale Date",
            "Expiration Date",
            "Amount",
            "Renewal Service",
            "Renewal Sale Date",
            "Days From Expiration",
        ];
        const lines = rows.map((row) => [
            row.client,
            row.client_mindbody_id,
            row.client_email,
            row.client_phone,
            row.service,
            row.sale_date,
            row.expiration_date,
            row.total_amount,
            row.renewal_service,
            row.renewal_sale_date,
            row.days_from_expiration_to_renewal,
        ].map(csvValue).join(","));
        const blob = new Blob([[headers.map(csvValue).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `retention-followup-${filters.status}-${filters.date_from}-${filters.date_to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchSites().catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchRows();
    }, [token]);

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
                                onChange={(event) => setFilters({ ...filters, site: event.target.value })}
                            >
                                <MenuItem value="">All Sites</MenuItem>
                                {sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label="Status"
                                value={filters.status}
                                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                            >
                                <MenuItem value="not_renewed">Not Renewed</MenuItem>
                                <MenuItem value="renewed">Renewed / Reactivated</MenuItem>
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
                            <Button variant="outlined" onClick={exportCsv} disabled={!rows.length}>
                                Export CSV
                            </Button>
                        </div>
                    </Paper>

                    <Alert severity="info">
                        This list uses only Pricing Options marked as Track Retention. Records are based on services
                        that expired inside the selected date range.
                    </Alert>

                    <Paper style={{ padding: "16px" }}>
                        <h2 style={{ marginTop: 0 }}>{count.toLocaleString()} records</h2>
                        <TableContainer style={{ maxHeight: 620 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Client</TableCell>
                                        <TableCell>Contact</TableCell>
                                        <TableCell>Service</TableCell>
                                        <TableCell>Expiration</TableCell>
                                        <TableCell>Renewal</TableCell>
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
                                            <TableCell>{row.service || "N/A"}</TableCell>
                                            <TableCell>{row.expiration_date || "N/A"}</TableCell>
                                            <TableCell>
                                                {row.renewal_service || "N/A"}
                                                {row.renewal_sale_date ? ` (${row.renewal_sale_date})` : ""}
                                            </TableCell>
                                            <TableCell align="right">{row.days_from_expiration_to_renewal ?? "N/A"}</TableCell>
                                            <TableCell align="right">{formatMoney(row.total_amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!rows.length && (
                                        <TableRow>
                                            <TableCell colSpan={7}>No data</TableCell>
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

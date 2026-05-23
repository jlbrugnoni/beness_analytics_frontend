import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";


const formatDateTime = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleString();
};


export default function LoginLogsPage() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [rows, setRows] = useState([]);
    const [users, setUsers] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        user: "",
        login_type: "",
        success: "",
        date_from: "",
        date_to: "",
        search: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchAllPages = async (endpoint) => {
        let url = `${backendUrl}/api/data/${endpoint}/`;
        let allRows = [];
        while (url) {
            const response = await axios.get(url, authHeaders);
            const pageRows = response.data.results || response.data;
            allRows = [...allRows, ...pageRows];
            url = normalizeApiNextUrl(response.data.next, backendUrl);
        }
        return allRows;
    };

    const fetchRows = async (nextPage = page, nextFilters = filters) => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            params.set("page", nextPage);
            Object.entries(nextFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await axios.get(`${backendUrl}/api/data/login-logs/?${params.toString()}`, authHeaders);
            const data = response.data.results ? response.data : { results: response.data, count: response.data.length };
            setRows(data.results);
            setCount(data.count || data.results.length);
            setPage(nextPage);
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || "Error loading login logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        fetchAllPages("users").then(setUsers).catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchRows(1);
    }, [token]);

    const totalPages = Math.max(1, Math.ceil(count / 15));
    const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
    const clearFilters = () => {
        const cleared = { user: "", login_type: "", success: "", date_from: "", date_to: "", search: "" };
        setFilters(cleared);
        fetchRows(1, cleared);
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Login Logs</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Login Logs</h1>
                </div>

                {error && <Alert severity="error" style={{ width: "90%", marginBottom: "12px" }}>{error}</Alert>}

                <Paper style={{ width: "90%", padding: "16px", display: "grid", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <TextField select label="User" value={filters.user} onChange={(event) => updateFilter("user", event.target.value)}>
                            <MenuItem value="">All Users</MenuItem>
                            {users.map((user) => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.email}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField select label="Type" value={filters.login_type} onChange={(event) => updateFilter("login_type", event.target.value)}>
                            <MenuItem value="">All Types</MenuItem>
                            <MenuItem value="main">Login</MenuItem>
                            <MenuItem value="secondary">Secondary</MenuItem>
                            <MenuItem value="logout">Logout</MenuItem>
                        </TextField>
                        <TextField select label="Result" value={filters.success} onChange={(event) => updateFilter("success", event.target.value)}>
                            <MenuItem value="">All Results</MenuItem>
                            <MenuItem value="true">Success</MenuItem>
                            <MenuItem value="false">Failed</MenuItem>
                        </TextField>
                        <TextField label="Date From" type="date" value={filters.date_from} InputLabelProps={{ shrink: true }} onChange={(event) => updateFilter("date_from", event.target.value)} />
                        <TextField label="Date To" type="date" value={filters.date_to} InputLabelProps={{ shrink: true }} onChange={(event) => updateFilter("date_to", event.target.value)} />
                        <TextField label="Search" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Button variant="contained" onClick={() => fetchRows(1)} disabled={loading}>
                            {loading ? "Loading..." : "Apply Filters"}
                        </Button>
                        <Button variant="outlined" onClick={clearFilters}>Clear</Button>
                    </div>
                </Paper>

                <TableContainer component={Paper} className={styles.tableContainer}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Result</TableCell>
                                <TableCell>IP Address</TableCell>
                                <TableCell>User Agent</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                                    <TableCell>{row.user_email || "N/A"}</TableCell>
                                    <TableCell>{row.login_type}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            color={row.success ? "success" : "error"}
                                            label={row.success ? "Success" : "Failed"}
                                        />
                                    </TableCell>
                                    <TableCell>{row.ip_address || "N/A"}</TableCell>
                                    <TableCell style={{ maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {row.user_agent || "N/A"}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!rows.length && (
                                <TableRow>
                                    <TableCell colSpan={6}>{loading ? "Loading..." : "No records found."}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <div style={{ width: "90%", display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
                    <Button variant="outlined" disabled={page <= 1 || loading} onClick={() => fetchRows(page - 1)}>
                        Previous
                    </Button>
                    <span>Page {page} of {totalPages} | {count.toLocaleString()} records</span>
                    <Button variant="outlined" disabled={page >= totalPages || loading} onClick={() => fetchRows(page + 1)}>
                        Next
                    </Button>
                </div>
            </div>
        </MainPage>
    );
}

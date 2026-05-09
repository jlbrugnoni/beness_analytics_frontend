import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import { importedResources } from "@/constants/importedResources";
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


const formatCell = (value, column) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (column.type === "boolean") return value ? "Yes" : "No";
    if (column.type === "list") return Array.isArray(value) && value.length ? value.join(", ") : "None";
    if (column.type === "money") return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (column.type === "datetime") return new Date(value).toLocaleString();
    return String(value);
};


export default function ImportedResourcePage() {
    const router = useRouter();
    const { resource } = router.query;
    const config = importedResources[resource];
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [rows, setRows] = useState([]);
    const [sites, setSites] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        site: "",
        date_from: "",
        date_to: "",
        search: "",
        is_valid: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchRows = async (nextPage = page, nextFilters = filters) => {
        if (!token || !config) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            params.set("page", nextPage);
            Object.entries(nextFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await axios.get(`${backendUrl}/api/data/${config.endpoint}/?${params.toString()}`, authHeaders);
            const data = response.data.results ? response.data : { results: response.data, count: response.data.length };
            setRows(data.results);
            setCount(data.count || data.results.length);
            setPage(nextPage);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading imported data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        axios
            .get(`${backendUrl}/api/data/sites/`, authHeaders)
            .then((response) => setSites(response.data.results || response.data))
            .catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchRows(1);
    }, [token, config?.endpoint]);

    if (!config) {
        return (
            <MainPage>
                <div className={styles.container}>Imported resource not found.</div>
            </MainPage>
        );
    }

    const totalPages = Math.max(1, Math.ceil(count / 15));
    const updateFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {config.label}</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>{config.label}</h1>
                </div>

                {error && <Alert severity="error" style={{ width: "90%", marginBottom: "12px" }}>{error}</Alert>}

                <Paper style={{ width: "90%", padding: "16px", display: "grid", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <TextField
                            select
                            label="Site"
                            value={filters.site}
                            onChange={(event) => updateFilter("site", event.target.value)}
                        >
                            <MenuItem value="">All Sites</MenuItem>
                            {sites.map((site) => (
                                <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                            ))}
                        </TextField>

                        {!config.hideDateFilters && !config.raw && (
                            <>
                                <TextField
                                    label="Date From"
                                    type="date"
                                    value={filters.date_from}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(event) => updateFilter("date_from", event.target.value)}
                                />
                                <TextField
                                    label="Date To"
                                    type="date"
                                    value={filters.date_to}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(event) => updateFilter("date_to", event.target.value)}
                                />
                            </>
                        )}

                        {config.raw && (
                            <TextField
                                select
                                label="Validity"
                                value={filters.is_valid}
                                onChange={(event) => updateFilter("is_valid", event.target.value)}
                            >
                                <MenuItem value="">All Rows</MenuItem>
                                <MenuItem value="true">Valid</MenuItem>
                                <MenuItem value="false">Invalid</MenuItem>
                            </TextField>
                        )}

                        <TextField
                            label="Search"
                            value={filters.search}
                            onChange={(event) => updateFilter("search", event.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Button variant="contained" onClick={() => fetchRows(1)} disabled={loading}>
                            {loading ? "Loading..." : "Apply Filters"}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                const clearedFilters = { site: "", date_from: "", date_to: "", search: "", is_valid: "" };
                                setFilters(clearedFilters);
                                fetchRows(1, clearedFilters);
                            }}
                        >
                            Clear
                        </Button>
                    </div>
                </Paper>

                <TableContainer component={Paper} className={styles.tableContainer}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {config.columns.map((column) => (
                                    <TableCell key={column.field}>{column.label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    {config.columns.map((column) => (
                                        <TableCell key={column.field}>
                                            {formatCell(row[column.field], column)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                            {!rows.length && (
                                <TableRow>
                                    <TableCell colSpan={config.columns.length}>No records found.</TableCell>
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

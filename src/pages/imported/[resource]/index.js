import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useAccess from "@/hooks/useAccess";
import { importedResources } from "@/constants/importedResources";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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
    if (column.type === "money") return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (column.type === "datetime") return new Date(value).toLocaleString();
    return String(value);
};


const SummaryBox = ({ label, value }) => (
    <Paper variant="outlined" style={{ padding: "12px" }}>
        <div style={{ color: "#666", fontSize: "13px" }}>{label}</div>
        <div style={{ fontSize: "22px", fontWeight: 700 }}>{formatCell(value, {})}</div>
    </Paper>
);


export default function ImportedResourcePage() {
    const router = useRouter();
    const { resource } = router.query;
    const config = importedResources[resource];
    const token = useFetchToken();
    const access = useAccess();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const canViewMoney = Boolean(access.capabilities?.can_view_money);
    const visibleColumns = (config?.columns || []).filter((column) => canViewMoney || column.type !== "money");

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
    const [success, setSuccess] = useState("");
    const [rollingBackId, setRollingBackId] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchRows = async (nextPage = page, nextFilters = filters) => {
        if (!token || !config) return;
        setLoading(true);
        setError("");
        setSuccess("");
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

    const openImportDetail = async (row) => {
        setDetailOpen(true);
        setDetail(null);
        setDetailLoading(true);
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/report-imports/${row.id}/detail-summary/`,
                authHeaders,
            );
            setDetail(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading import detail.");
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const rollbackImport = async (row) => {
        if (!row?.id) return;
        setError("");
        setSuccess("");
        setRollingBackId(row.id);
        try {
            const payload = {
                confirmation: "DELETE REPORT DATA",
                dry_run: true,
                include_schedule_data: true,
            };
            const dryRun = await axios.post(
                `${backendUrl}/api/data/report-imports/${row.id}/rollback/`,
                payload,
                authHeaders,
            );
            const deletedCounts = dryRun.data.deleted_counts || {};
            const summary = Object.entries(deletedCounts)
                .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`)
                .join("\n");
            const confirmation = window.prompt(
                `This will delete the imported report data for:\n${row.file_name}\n\n${summary}\n\nType DELETE REPORT DATA to continue.`
            );
            if (confirmation !== "DELETE REPORT DATA") return;
            const response = await axios.post(
                `${backendUrl}/api/data/report-imports/${row.id}/rollback/`,
                {
                    ...payload,
                    dry_run: false,
                },
                authHeaders,
            );
            const removed = response.data.deleted_counts || {};
            setSuccess(`Rollback complete. Report removed: ${removed.report_import || 0}.`);
            await fetchRows(page);
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || "Error rolling back import.");
        } finally {
            setRollingBackId(null);
        }
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
                {success && <Alert severity="success" style={{ width: "90%", marginBottom: "12px" }}>{success}</Alert>}

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
                                {visibleColumns.map((column) => (
                                    <TableCell key={column.field}>{column.label}</TableCell>
                                ))}
                                {resource === "report-imports" && <TableCell>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    {visibleColumns.map((column) => (
                                        <TableCell key={column.field}>
                                            {formatCell(row[column.field], column)}
                                        </TableCell>
                                    ))}
                                    {resource === "report-imports" && (
                                        <TableCell>
                                            <Button size="small" variant="outlined" onClick={() => openImportDetail(row)}>
                                                Details
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                onClick={() => rollbackImport(row)}
                                                disabled={rollingBackId === row.id}
                                                style={{ marginLeft: "8px" }}
                                            >
                                                {rollingBackId === row.id ? "Rolling Back..." : "Rollback"}
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {!rows.length && (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length + (resource === "report-imports" ? 1 : 0)}>No records found.</TableCell>
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

            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="lg">
                <DialogTitle>Import Detail</DialogTitle>
                <DialogContent style={{ display: "grid", gap: "16px", paddingTop: "12px" }}>
                    {detailLoading && <Alert severity="info">Loading import detail...</Alert>}
                    {detail && (
                        <>
                            <div>
                                <h2 style={{ margin: 0 }}>{detail.file_name}</h2>
                                <p style={{ margin: "6px 0 0", color: "#666" }}>
                                    {detail.report_type} | {detail.status} | {formatCell(detail.uploaded_at, { type: "datetime" })}
                                </p>
                            </div>

                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                                {Object.entries(detail.counts || {}).map(([key, value]) => (
                                    <SummaryBox key={key} label={key.replaceAll("_", " ")} value={value} />
                                ))}
                            </div>

                            <Paper variant="outlined" style={{ padding: "14px" }}>
                                <h3 style={{ marginTop: 0 }}>Changed / Created Version Samples</h3>
                                <TableContainer style={{ maxHeight: 300 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Row</TableCell>
                                                <TableCell>Changed Fields</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(detail.changed_samples || []).map((sample, index) => (
                                                <TableRow key={`changed-${index}`}>
                                                    <TableCell>{sample.row_number || "N/A"}</TableCell>
                                                    <TableCell>{sample.changed_fields?.join(", ") || "None"}</TableCell>
                                                </TableRow>
                                            ))}
                                            {!detail.changed_samples?.length && (
                                                <TableRow>
                                                    <TableCell colSpan={2}>No changed samples.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>

                            <Paper variant="outlined" style={{ padding: "14px" }}>
                                <h3 style={{ marginTop: 0 }}>Invalid Row Samples</h3>
                                <TableContainer style={{ maxHeight: 300 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Row</TableCell>
                                                <TableCell>Errors</TableCell>
                                                <TableCell>Summary</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(detail.invalid_samples || []).map((sample, index) => (
                                                <TableRow key={`invalid-${index}`}>
                                                    <TableCell>{sample.row_number}</TableCell>
                                                    <TableCell>{sample.errors?.join(", ") || "None"}</TableCell>
                                                    <TableCell>{sample.summary || "N/A"}</TableCell>
                                                </TableRow>
                                            ))}
                                            {!detail.invalid_samples?.length && (
                                                <TableRow>
                                                    <TableCell colSpan={3}>No invalid samples.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </MainPage>
    );
}

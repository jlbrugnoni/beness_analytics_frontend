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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";


const reportTypes = [
    { value: "attendance_with_revenue", label: "Attendance with Revenue" },
    { value: "sales", label: "Sales", disabled: true },
    { value: "sales_by_service", label: "Sales by Service", disabled: true },
];


const SummaryBox = ({ label, value }) => (
    <Paper style={{ padding: "14px", minHeight: "72px" }}>
        <div style={{ fontSize: "13px", color: "#666" }}>{label}</div>
        <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
    </Paper>
);


export default function Uploads() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [sites, setSites] = useState([]);
    const [site, setSite] = useState("");
    const [reportType, setReportType] = useState("attendance_with_revenue");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    useEffect(() => {
        const fetchSites = async () => {
            if (!token) return;
            const response = await axios.get(`${backendUrl}/api/data/sites/`, authHeaders);
            const nextSites = response.data.results || response.data;
            setSites(nextSites);
            if (!site && nextSites.length > 0) {
                setSite(nextSites[0].id);
            }
        };

        fetchSites().catch((err) => setError(err.response?.data?.detail || "Error loading sites."));
    }, [token]);

    const handlePreview = async () => {
        if (!site || !reportType || !file) {
            setError("Select site, report type, and file.");
            return;
        }

        setLoading(true);
        setError("");
        setPreview(null);
        setImportResult(null);

        const formData = new FormData();
        formData.append("site", site);
        formData.append("report_type", reportType);
        formData.append("file", file);

        try {
            const response = await axios.post(`${backendUrl}/api/data/report-imports/preview/`, formData, {
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setPreview(response.data);
        } catch (err) {
            setError(err.response?.data?.error || "Error previewing report.");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!site || !reportType || !file || !preview) {
            setError("Preview the file before importing.");
            return;
        }

        if (!window.confirm("Import this report and update attendance records?")) return;

        setImporting(true);
        setError("");
        setImportResult(null);

        const formData = new FormData();
        formData.append("site", site);
        formData.append("report_type", reportType);
        formData.append("file", file);

        try {
            const response = await axios.post(`${backendUrl}/api/data/report-imports/import-file/`, formData, {
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setImportResult(response.data.import);
            setPreview(response.data.preview);
        } catch (err) {
            setError(err.response?.data?.error || "Error importing report.");
        } finally {
            setImporting(false);
        }
    };

    const lookupRows = preview
        ? Object.entries(preview.lookup_preview).map(([key, value]) => ({
            key,
            label: key.replaceAll("_", " "),
            ...value,
        }))
        : [];

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Uploads</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Uploads</h1>
                </div>

                <div style={{ maxWidth: "980px", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper style={{ padding: "18px", display: "grid", gap: "16px" }}>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                            <TextField
                                select
                                label="Site"
                                value={site}
                                onChange={(event) => setSite(event.target.value)}
                            >
                                {sites.map((item) => (
                                    <MenuItem value={item.id} key={item.id}>
                                        {item.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Report Type"
                                value={reportType}
                                onChange={(event) => setReportType(event.target.value)}
                            >
                                {reportTypes.map((type) => (
                                    <MenuItem value={type.value} key={type.value} disabled={type.disabled}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                                Select XLSX
                                <input
                                    hidden
                                    type="file"
                                    accept=".xlsx"
                                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                                />
                            </Button>
                            <span>{file ? file.name : "No file selected"}</span>
                            <Button variant="contained" onClick={handlePreview} disabled={loading || !file}>
                                {loading ? "Previewing..." : "Preview Import"}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={handleImport}
                                disabled={importing || !preview || !preview.is_valid_schema || preview.row_counts.invalid_rows > 0}
                            >
                                {importing ? "Importing..." : "Confirm Import"}
                            </Button>
                            <Link href="/data">
                                <Button variant="text">Manage Data Tables</Button>
                            </Link>
                        </div>
                    </Paper>

                    {preview && (
                        <>
                            {importResult && (
                                <Alert severity="success">
                                    Import completed. Created {importResult.attendance_created}, changed {importResult.attendance_changed},
                                    identical {importResult.attendance_identical}. Import ID: {importResult.report_import_id}
                                </Alert>
                            )}

                            {!preview.is_valid_schema && (
                                <Alert severity="warning">
                                    Missing required headers: {preview.missing_headers.join(", ")}
                                </Alert>
                            )}

                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                                <SummaryBox label="Data Rows" value={preview.row_counts.data_rows} />
                                <SummaryBox label="Valid Rows" value={preview.row_counts.valid_rows} />
                                <SummaryBox label="Invalid Rows" value={preview.row_counts.invalid_rows} />
                                <SummaryBox label="Duplicates" value={preview.row_counts.duplicate_extra_rows} />
                                <SummaryBox label="Revenue" value={preview.revenue.total.toLocaleString()} />
                                <SummaryBox label="Date From" value={preview.date_range.from || "N/A"} />
                                <SummaryBox label="Date To" value={preview.date_range.to || "N/A"} />
                            </div>

                            <Paper style={{ padding: "18px" }}>
                                <h2 style={{ marginTop: 0 }}>Attendance</h2>
                                <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                                    <SummaryBox label="Attended" value={preview.attendance.attended_inferred} />
                                    <SummaryBox label="Late Cancels" value={preview.attendance.late_cancel} />
                                    <SummaryBox label="No Shows" value={preview.attendance.no_show} />
                                    <SummaryBox label="Zero Revenue Rows" value={preview.revenue.zero_revenue_rows} />
                                </div>
                            </Paper>

                            <Paper style={{ padding: "18px" }}>
                                <h2 style={{ marginTop: 0 }}>Lookup Records</h2>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Table</TableCell>
                                                <TableCell>Total Found</TableCell>
                                                <TableCell>New</TableCell>
                                                <TableCell>Sample New</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lookupRows.map((row) => (
                                                <TableRow key={row.key}>
                                                    <TableCell style={{ textTransform: "capitalize" }}>{row.label}</TableCell>
                                                    <TableCell>{row.total}</TableCell>
                                                    <TableCell>{row.new}</TableCell>
                                                    <TableCell>{row.sample_new.join(", ") || "None"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>

                            {preview.invalid_row_samples.length > 0 && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Invalid Row Samples</h2>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Row</TableCell>
                                                    <TableCell>Errors</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {preview.invalid_row_samples.map((row) => (
                                                    <TableRow key={row.row_number}>
                                                        <TableCell>{row.row_number}</TableCell>
                                                        <TableCell>{row.errors.join(", ")}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            )}

                            {importResult && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Import Result</h2>
                                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                                        <SummaryBox label="Raw Rows Saved" value={importResult.raw_rows_created} />
                                        <SummaryBox label="Attendance Created" value={importResult.attendance_created} />
                                        <SummaryBox label="Attendance Changed" value={importResult.attendance_changed} />
                                        <SummaryBox label="Attendance Identical" value={importResult.attendance_identical} />
                                        <SummaryBox label="Natural Key Collisions" value={importResult.natural_key_collisions} />
                                        <SummaryBox label="Versions Created" value={importResult.versions_created} />
                                    </div>
                                    <TableContainer style={{ marginTop: "16px" }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Lookup Table</TableCell>
                                                    <TableCell>Created</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.entries(importResult.new_lookups).map(([key, value]) => (
                                                    <TableRow key={key}>
                                                        <TableCell style={{ textTransform: "capitalize" }}>{key.replaceAll("_", " ")}</TableCell>
                                                        <TableCell>{value}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MainPage>
    );
}

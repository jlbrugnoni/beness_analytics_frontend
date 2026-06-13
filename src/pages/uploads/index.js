import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useAccess from "@/hooks/useAccess";
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
    { value: "sales", label: "Sales" },
    { value: "sales_by_service", label: "Sales by Service" },
    { value: "trainer_availability", label: "Trainer Availability" },
];


const SummaryBox = ({ label, value }) => (
    <Paper style={{ padding: "14px", minHeight: "72px" }}>
        <div style={{ fontSize: "13px", color: "#666" }}>{label}</div>
        <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
    </Paper>
);


const ImpactGrid = ({ impact }) => {
    if (!impact) return null;
    return (
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <SummaryBox label="Raw Rows To Save" value={impact.raw_rows_to_save} />
            <SummaryBox label="New Records" value={impact.current_records_to_create} />
            <SummaryBox label="Modified Records" value={impact.current_records_to_update} />
            <SummaryBox label="Already Added" value={impact.current_records_unchanged} />
            <SummaryBox label="Current Records In File" value={impact.current_records_in_file} />
            <SummaryBox label="Attendance Collisions" value={impact.natural_key_collisions} />
            <SummaryBox label="Ambiguous Rows" value={impact.ambiguous_rows || 0} />
        </div>
    );
};


const SampleTable = ({ title, samples }) => {
    if (!samples?.length) return null;
    return (
        <Paper style={{ padding: "18px" }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Count</TableCell>
                            <TableCell>Rows</TableCell>
                            <TableCell>Sample Data</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {samples.map((sample, index) => (
                            <TableRow key={`${title}-${index}`}>
                                <TableCell>{sample.count}</TableCell>
                                <TableCell>{sample.row_numbers.join(", ")}</TableCell>
                                <TableCell>
                                    {Object.entries(sample.payload)
                                        .map(([key, value]) => `${key}: ${value}`)
                                        .join(" | ")}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};


const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "number") return value.toLocaleString();
    return value;
};


const formatSampleList = (items) => {
    if (!items?.length) return "None";
    return items.map((item) => {
        if (typeof item === "object" && item !== null) {
            return Object.entries(item).map(([key, value]) => `${key}: ${value}`).join(" / ");
        }
        return item;
    }).join(", ");
};


const importMetricLabels = {
    raw_rows_created: "Raw Rows Saved",
    attendance_created: "Attendance Created",
    attendance_changed: "Attendance Changed",
    attendance_identical: "Attendance Identical",
    sale_lines_created: "Sale Lines Created",
    sale_lines_changed: "Sale Lines Changed",
    sale_lines_identical: "Sale Lines Identical",
    service_purchases_created: "Service Purchases Created",
    service_purchases_changed: "Service Purchases Changed",
    service_purchases_identical: "Service Purchases Identical",
    service_purchase_ambiguous_rows: "Ambiguous Purchase Rows Skipped",
    scheduled_classes_created: "Scheduled Classes Created",
    scheduled_classes_changed: "Scheduled Classes Changed",
    scheduled_classes_identical: "Scheduled Classes Identical",
    scheduled_classes_needing_review: "Classes Needing Review",
    scheduled_classes_conflict: "Classes With Conflict",
    natural_key_collisions: "Natural Key Collisions",
    versions_created: "Versions Created",
};


const roomCapacityKey = (row) => row.room_key || `${row.studio}::${row.room}`;


export default function Uploads() {
    const token = useFetchToken();
    const access = useAccess();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const canViewMoney = Boolean(access.capabilities?.can_view_money);
    const canResetData = Boolean(access.capabilities?.can_reset_data);

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [site, setSite] = useState("");
    const [studio, setStudio] = useState("");
    const [reportType, setReportType] = useState("attendance_with_revenue");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [scheduleAutomation, setScheduleAutomation] = useState(null);
    const [retentionAutomation, setRetentionAutomation] = useState(null);
    const [clientMetricsAutomation, setClientMetricsAutomation] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [repairingPurchases, setRepairingPurchases] = useState(false);
    const [purchaseRepairResult, setPurchaseRepairResult] = useState(null);
    const [rebuildingClientMetrics, setRebuildingClientMetrics] = useState(false);
    const [clientMetricDateFrom, setClientMetricDateFrom] = useState("");
    const [clientMetricDateTo, setClientMetricDateTo] = useState("");
    const [clientMetricRebuildResult, setClientMetricRebuildResult] = useState(null);
    const [roomCapacities, setRoomCapacities] = useState({});

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    useEffect(() => {
        const fetchLookups = async () => {
            if (!token) return;
            const [sitesResponse, studiosResponse] = await Promise.all([
                axios.get(`${backendUrl}/api/data/sites/`, authHeaders),
                axios.get(`${backendUrl}/api/data/studios/`, authHeaders),
            ]);
            const nextSites = sitesResponse.data.results || sitesResponse.data;
            const nextStudios = studiosResponse.data.results || studiosResponse.data;
            setSites(nextSites);
            setStudios(nextStudios);
            if (!site && nextSites.length > 0) {
                setSite(nextSites[0].id);
            }
        };

        fetchLookups().catch((err) => setError(err.response?.data?.detail || "Error loading upload lookups."));
    }, [token]);

    const visibleStudios = site
        ? studios.filter((item) => String(item.site) === String(site))
        : studios;

    useEffect(() => {
        if (studio && !visibleStudios.some((item) => String(item.id) === String(studio))) {
            setStudio("");
        }
    }, [site, studios, studio]);

    useEffect(() => {
        setPreview(null);
        setImportResult(null);
        setScheduleAutomation(null);
        setRetentionAutomation(null);
        setClientMetricsAutomation(null);
        setRoomCapacities({});
    }, [site, studio, reportType]);

    const handlePreview = async () => {
        if (!site || !reportType || !file) {
            setError("Select site, report type, and file.");
            return;
        }
        if (reportType === "sales_by_service" && !studio) {
            setError("Select the studio for this Sales by Service export.");
            return;
        }

        setLoading(true);
        setError("");
        setPreview(null);
        setImportResult(null);
        setScheduleAutomation(null);
        setRetentionAutomation(null);
        setRoomCapacities({});

        const formData = new FormData();
        formData.append("site", site);
        formData.append("report_type", reportType);
        formData.append("file", file);
        if (reportType === "sales_by_service") {
            formData.append("studio", studio);
        }

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
        if (reportType === "sales_by_service" && !studio) {
            setError("Select the studio for this Sales by Service export.");
            return;
        }

        if (!window.confirm("Import this report and update analytics records?")) return;

        setImporting(true);
        setError("");
        setImportResult(null);
        setScheduleAutomation(null);
        setRetentionAutomation(null);

        const formData = new FormData();
        formData.append("site", site);
        formData.append("report_type", reportType);
        formData.append("file", file);
        if (reportType === "sales_by_service") {
            formData.append("studio", studio);
        }
        if (reportType === "trainer_availability") {
            formData.append("room_capacities", JSON.stringify(
                (preview.capacity_requirements || []).map((row) => ({
                    studio: row.studio,
                    room: row.room,
                    group_capacity: Number(roomCapacities[roomCapacityKey(row)] || 0),
                    private_capacity: 0,
                }))
            ));
        }

        try {
            const response = await axios.post(`${backendUrl}/api/data/report-imports/import-file/`, formData, {
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setImportResult(response.data.import);
            setScheduleAutomation(response.data.schedule_automation || null);
            setRetentionAutomation(response.data.retention_automation || null);
            setClientMetricsAutomation(response.data.client_metrics_automation || null);
            setPreview(null);
            setFile(null);
            setRoomCapacities({});
        } catch (err) {
            setError(err.response?.data?.error || "Error importing report.");
        } finally {
            setImporting(false);
        }
    };

    const handleResetAnalyticsData = async () => {
        const confirmation = window.prompt(
            "This will delete imported analytics data, clients, pricing options, payment methods, generated/imported classes, expected slots, and imports. Users, sites, studios, rooms, staff, weekly room templates, and studio closures are preserved. Type RESET ANALYTICS DATA to continue."
        );
        if (confirmation !== "RESET ANALYTICS DATA") return;

        setResetting(true);
        setError("");
        setImportResult(null);
        setScheduleAutomation(null);
        setRetentionAutomation(null);
        setClientMetricsAutomation(null);

        try {
            const response = await axios.post(
                `${backendUrl}/api/data/report-imports/reset-analytics-data/`,
                { confirmation },
                authHeaders,
            );
            setPreview(null);
            setFile(null);
            alert(response.data.message || "Analytics data reset completed.");
        } catch (err) {
            setError(err.response?.data?.error || "Error resetting analytics data.");
        } finally {
            setResetting(false);
        }
    };

    const handlePurchaseRepairAudit = async () => {
        setRepairingPurchases(true);
        setError("");
        setPurchaseRepairResult(null);
        try {
            const response = await axios.post(
                `${backendUrl}/api/data/report-imports/repair-sales-by-service-purchases/`,
                { site, dry_run: true },
                authHeaders,
            );
            setPurchaseRepairResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || "Error auditing purchase repairs.");
        } finally {
            setRepairingPurchases(false);
        }
    };

    const handlePurchaseRepairApply = async () => {
        const confirmation = window.prompt(
            "This will merge safe duplicate Sales by Service purchases, leave ambiguous groups unchanged, and rebuild affected retention snapshots. Type REPAIR PURCHASES to continue."
        );
        if (confirmation !== "REPAIR PURCHASES") return;

        setRepairingPurchases(true);
        setError("");
        try {
            const response = await axios.post(
                `${backendUrl}/api/data/report-imports/repair-sales-by-service-purchases/`,
                { site, apply: true, confirmation },
                authHeaders,
            );
            setPurchaseRepairResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || "Error applying purchase repairs.");
        } finally {
            setRepairingPurchases(false);
        }
    };

    const handleClientMetricRebuild = async () => {
        if (!site || !clientMetricDateFrom || !clientMetricDateTo) {
            setError("Select a site, start date, and end date for the client metric rebuild.");
            return;
        }
        if (clientMetricDateFrom > clientMetricDateTo) {
            setError("Client metric start date cannot be after the end date.");
            return;
        }
        if (!window.confirm(
            `Rebuild client metrics for ${clientMetricDateFrom} through ${clientMetricDateTo}?`
        )) return;

        setRebuildingClientMetrics(true);
        setError("");
        setClientMetricRebuildResult(null);
        try {
            const response = await axios.post(
                `${backendUrl}/api/data/analytics/client-metrics/rebuild/`,
                {
                    site,
                    date_from: clientMetricDateFrom,
                    date_to: clientMetricDateTo,
                },
                authHeaders,
            );
            setClientMetricRebuildResult(response.data);
        } catch (err) {
            setError(
                err.response?.data?.detail
                || err.response?.data?.error
                || "Error rebuilding client metrics."
            );
        } finally {
            setRebuildingClientMetrics(false);
        }
    };

    const lookupRows = preview
        ? Object.entries(preview.lookup_preview).map(([key, value]) => ({
            key,
            label: key.replaceAll("_", " "),
            ...value,
        }))
        : [];
    const capacityRequirements = preview?.capacity_requirements || [];
    const missingCapacityCount = reportType === "trainer_availability"
        ? capacityRequirements.filter((row) => Number(roomCapacities[roomCapacityKey(row)] || 0) <= 0).length
        : 0;
    const canImport = Boolean(preview)
        && preview.is_valid_schema
        && !importing
        && (preview.row_counts.invalid_rows === 0 || reportType === "trainer_availability")
        && missingCapacityCount === 0
        && (reportType !== "sales_by_service" || Boolean(studio));

    useEffect(() => {
        if (!preview?.capacity_requirements) {
            setRoomCapacities({});
            return;
        }
        const nextCapacities = {};
        preview.capacity_requirements.forEach((row) => {
            const key = roomCapacityKey(row);
            nextCapacities[key] = row.current_capacity > 0 ? String(row.current_capacity) : "";
        });
        setRoomCapacities(nextCapacities);
    }, [preview]);

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
                            {reportType === "sales_by_service" && (
                                <TextField
                                    select
                                    required
                                    label="Studio for this file"
                                    value={studio}
                                    onChange={(event) => setStudio(event.target.value)}
                                    helperText="Sales by Service does not include studio, so select the studio used for this export."
                                >
                                    <MenuItem value="">Select Studio</MenuItem>
                                    {visibleStudios.map((item) => (
                                        <MenuItem value={item.id} key={item.id}>
                                            {item.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                                Select XLSX
                                <input
                                    hidden
                                    type="file"
                                    accept=".xlsx,.xls"
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
                                disabled={!canImport}
                            >
                                {importing ? "Importing..." : "Confirm Import"}
                            </Button>
                            <Link href="/data">
                                <Button variant="text">Manage Data Tables</Button>
                            </Link>
                            {canResetData && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={handlePurchaseRepairAudit}
                                        disabled={repairingPurchases}
                                    >
                                        {repairingPurchases ? "Auditing..." : "Audit Purchase Repairs"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        onClick={handlePurchaseRepairApply}
                                        disabled={repairingPurchases || !purchaseRepairResult?.safe_group_count}
                                    >
                                        Apply Safe Purchase Repairs
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleResetAnalyticsData}
                                        disabled={resetting}
                                    >
                                        {resetting ? "Resetting..." : "Reset Analytics Data"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Paper>

                    {canResetData && (
                        <Paper style={{ padding: "18px", display: "grid", gap: "14px" }}>
                            <div>
                                <h2 style={{ margin: 0 }}>Client Metric Maintenance</h2>
                                <p style={{ marginBottom: 0, color: "#666" }}>
                                    Rebuild monthly and weekly client metrics from existing imported records.
                                </p>
                            </div>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                                <TextField
                                    type="date"
                                    label="Date From"
                                    value={clientMetricDateFrom}
                                    onChange={(event) => setClientMetricDateFrom(event.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    type="date"
                                    label="Date To"
                                    value={clientMetricDateTo}
                                    onChange={(event) => setClientMetricDateTo(event.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleClientMetricRebuild}
                                    disabled={rebuildingClientMetrics || !site || !clientMetricDateFrom || !clientMetricDateTo}
                                >
                                    {rebuildingClientMetrics ? "Rebuilding..." : "Rebuild Client Metrics"}
                                </Button>
                            </div>
                            {clientMetricRebuildResult && (
                                <Alert severity="success">
                                    Rebuilt {clientMetricRebuildResult.sites?.[0]?.retention?.length || 0} retention snapshots,
                                    {" "}{clientMetricRebuildResult.sites?.[0]?.monthly?.length || 0} monthly periods
                                    {" "}and {clientMetricRebuildResult.sites?.[0]?.weekly?.length || 0} weekly periods.
                                    {" "}Created {clientMetricRebuildResult.total_monthly_rows || 0} monthly rows
                                    {" "}and {clientMetricRebuildResult.total_weekly_rows || 0} weekly rows.
                                </Alert>
                            )}
                        </Paper>
                    )}

                    {purchaseRepairResult && (
                        <Paper style={{ padding: "18px" }}>
                            <h2 style={{ marginTop: 0 }}>Sales by Service Purchase Repair</h2>
                            <Alert severity={purchaseRepairResult.dry_run ? "info" : "success"} style={{ marginBottom: "16px" }}>
                                {purchaseRepairResult.dry_run
                                    ? "Dry-run only. No purchases were changed."
                                    : "Safe purchase repairs were applied."}
                            </Alert>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                                <SummaryBox label="Safe Groups" value={purchaseRepairResult.safe_group_count || 0} />
                                <SummaryBox label="Records To Merge" value={purchaseRepairResult.safe_purchase_records_to_merge || 0} />
                                <SummaryBox label="Ambiguous Groups" value={purchaseRepairResult.ambiguous_group_count || 0} />
                                <SummaryBox label="Merged Records" value={purchaseRepairResult.merged_purchase_records || 0} />
                                <SummaryBox label="Snapshots Rebuilt" value={purchaseRepairResult.rebuilt_snapshots?.length || 0} />
                            </div>
                            {!!purchaseRepairResult.ambiguous_groups?.length && (
                                <Alert severity="warning" style={{ marginTop: "16px" }}>
                                    Ambiguous groups were left unchanged. Review the first rows below before deciding if manual cleanup is needed.
                                </Alert>
                            )}
                            {!!purchaseRepairResult.ambiguous_groups?.length && (
                                <TableContainer style={{ marginTop: "16px", maxHeight: 320 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Client</TableCell>
                                                <TableCell>Studio</TableCell>
                                                <TableCell>Service</TableCell>
                                                <TableCell>Sale Date</TableCell>
                                                <TableCell>Records</TableCell>
                                                <TableCell>Reason</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {purchaseRepairResult.ambiguous_groups.slice(0, 25).map((group, index) => (
                                                <TableRow key={`${group.client_id}-${group.sale_date}-${index}`}>
                                                    <TableCell>{group.client}</TableCell>
                                                    <TableCell>{group.studio || "N/A"}</TableCell>
                                                    <TableCell>{group.service}</TableCell>
                                                    <TableCell>{group.sale_date}</TableCell>
                                                    <TableCell>{group.purchase_ids?.join(", ")}</TableCell>
                                                    <TableCell>{group.reason}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Paper>
                    )}

                    {preview && (
                        <>
                            {preview.import_context?.studio && (
                                <Alert severity="info">
                                    This Sales by Service file will be imported as studio: {preview.import_context.studio}.
                                </Alert>
                            )}

                            {importResult && (
                                <Alert severity="success">
                                    Import completed. Import ID: {importResult.report_import_id}
                                </Alert>
                            )}

                            {!preview.is_valid_schema && (
                                <Alert severity="warning">
                                    Missing required headers: {preview.missing_headers.join(", ")}
                                </Alert>
                            )}

                            {preview.data_quality?.requires_review && (
                                <Alert severity="warning">
                                    This report has items that require review. Check the samples before trusting the import for KPIs.
                                </Alert>
                            )}

                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                                <SummaryBox label="Data Rows" value={preview.row_counts.data_rows ?? preview.row_counts.class_rows} />
                                <SummaryBox label="Valid Rows" value={preview.row_counts.valid_rows} />
                                <SummaryBox label="Invalid Rows" value={preview.row_counts.invalid_rows} />
                                <SummaryBox label="Repeated Rows" value={preview.row_counts.duplicate_extra_rows ?? preview.data_quality?.exact_duplicate_groups ?? 0} />
                                {canViewMoney && <SummaryBox label="Revenue" value={formatValue(preview.revenue?.total)} />}
                                <SummaryBox label="Date From" value={formatValue(preview.date_range?.from)} />
                                <SummaryBox label="Date To" value={formatValue(preview.date_range?.to)} />
                            </div>

                            <Paper style={{ padding: "18px" }}>
                                <h2 style={{ marginTop: 0 }}>Import Impact</h2>
                                <ImpactGrid impact={preview.data_quality?.import_impact} />
                            </Paper>

                            {preview.attendance && (
                                <Paper style={{ padding: "18px" }}>
                                <h2 style={{ marginTop: 0 }}>Attendance</h2>
                                <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                                    <SummaryBox label="Attended" value={preview.attendance.attended_inferred} />
                                    <SummaryBox label="Late Cancels" value={preview.attendance.late_cancel} />
                                    <SummaryBox label="No Shows" value={preview.attendance.no_show} />
                                    {canViewMoney && <SummaryBox label="Zero Revenue Rows" value={preview.revenue?.zero_revenue_rows} />}
                                </div>
                                </Paper>
                            )}

                            {preview.sales && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Sales</h2>
                                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                                        <SummaryBox label="Sales" value={preview.sales.sale_count} />
                                        {canViewMoney && <SummaryBox label="Paid Total" value={formatValue(preview.sales.paid_total)} />}
                                        {canViewMoney && <SummaryBox label="Gross Item Total" value={formatValue(preview.sales.gross_item_total)} />}
                                        {canViewMoney && <SummaryBox label="Discount Total" value={formatValue(preview.sales.discount_total)} />}
                                        {canViewMoney && <SummaryBox label="Tax Total" value={formatValue(preview.sales.tax_total)} />}
                                    </div>
                                </Paper>
                            )}

                            {preview.services && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Services</h2>
                                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                                        <SummaryBox label="Purchases" value={preview.services.purchase_count} />
                                        {canViewMoney && <SummaryBox label="Total Amount" value={formatValue(preview.services.total_amount)} />}
                                        {canViewMoney && <SummaryBox label="Cash Equivalent" value={formatValue(preview.services.cash_equivalent)} />}
                                        {canViewMoney && <SummaryBox label="Non Cash" value={formatValue(preview.services.non_cash_equivalent)} />}
                                        <SummaryBox label="Quantity" value={formatValue(preview.services.quantity)} />
                                        <SummaryBox label="Expiration From" value={formatValue(preview.service_expiration_range?.from)} />
                                        <SummaryBox label="Expiration To" value={formatValue(preview.service_expiration_range?.to)} />
                                    </div>
                                </Paper>
                            )}

                            {preview.schedule && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Schedule</h2>
                                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                                        <SummaryBox label="Classes" value={preview.schedule.class_count} />
                                        <SummaryBox label="Valid Classes" value={preview.schedule.valid_class_count} />
                                        <SummaryBox label="Needs Review" value={preview.schedule.needs_review_count} />
                                        <SummaryBox label="Studios" value={preview.schedule.studios?.length} />
                                        <SummaryBox label="Rooms" value={preview.schedule.rooms?.length} />
                                        <SummaryBox label="Staff" value={preview.schedule.staff_members?.length} />
                                    </div>
                                </Paper>
                            )}

                            {capacityRequirements.length > 0 && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Room Capacities Required</h2>
                                    {missingCapacityCount > 0 && (
                                        <Alert severity="warning" style={{ marginBottom: "14px" }}>
                                            Add a positive group capacity for every room before importing this schedule.
                                        </Alert>
                                    )}
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Studio</TableCell>
                                                    <TableCell>Room</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell style={{ width: "180px" }}>Group Capacity</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {capacityRequirements.map((row) => {
                                                    const key = roomCapacityKey(row);
                                                    return (
                                                        <TableRow key={key}>
                                                            <TableCell>{row.studio}</TableCell>
                                                            <TableCell>{row.room}</TableCell>
                                                            <TableCell>{row.is_new ? "New room" : "Capacity missing"}</TableCell>
                                                            <TableCell>
                                                                <TextField
                                                                    size="small"
                                                                    type="number"
                                                                    value={roomCapacities[key] ?? ""}
                                                                    onChange={(event) => {
                                                                        setRoomCapacities((current) => ({
                                                                            ...current,
                                                                            [key]: event.target.value,
                                                                        }));
                                                                    }}
                                                                    inputProps={{ min: 1 }}
                                                                    error={Number(roomCapacities[key] || 0) <= 0}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            )}

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
                                                    <TableCell>{formatSampleList(row.sample_new)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>

                            <SampleTable
                                title="Repeated Row Samples"
                                samples={preview.data_quality?.repeated_row_samples}
                            />

                            <SampleTable
                                title="Natural Key Collision Samples"
                                samples={preview.data_quality?.natural_key_collision_samples}
                            />

                            <SampleTable
                                title="Exact Duplicate Class Samples"
                                samples={preview.data_quality?.exact_duplicate_samples}
                            />

                            {preview.data_quality?.same_room_time_different_staff?.length > 0 && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Room-Time Conflicts</h2>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Time</TableCell>
                                                    <TableCell>Studio</TableCell>
                                                    <TableCell>Room</TableCell>
                                                    <TableCell>Staff</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {preview.data_quality.same_room_time_different_staff.map((row, index) => (
                                                    <TableRow key={`room-conflict-${index}`}>
                                                        <TableCell>{row.date}</TableCell>
                                                        <TableCell>{row.start_time} - {row.end_time}</TableCell>
                                                        <TableCell>{row.studio}</TableCell>
                                                        <TableCell>{row.room}</TableCell>
                                                        <TableCell>{row.staff_members.join(", ")}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            )}

                            {preview.data_quality?.same_staff_time_multiple_rooms?.length > 0 && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Staff-Time Conflicts</h2>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Time</TableCell>
                                                    <TableCell>Staff</TableCell>
                                                    <TableCell>Rooms</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {preview.data_quality.same_staff_time_multiple_rooms.map((row, index) => (
                                                    <TableRow key={`staff-conflict-${index}`}>
                                                        <TableCell>{row.date}</TableCell>
                                                        <TableCell>{row.start_time} - {row.end_time}</TableCell>
                                                        <TableCell>{row.staff}</TableCell>
                                                        <TableCell>{row.rooms.join(", ")}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            )}

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
                                        {Object.entries(importMetricLabels)
                                            .filter(([key]) => importResult[key] !== undefined)
                                            .map(([key, label]) => (
                                                <SummaryBox key={key} label={label} value={importResult[key]} />
                                            ))}
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

                            {retentionAutomation && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Retention Automation</h2>
                                    {retentionAutomation.error ? (
                                        <Alert severity="warning">{retentionAutomation.error}</Alert>
                                    ) : retentionAutomation.skipped ? (
                                        <Alert severity="info">
                                            {retentionAutomation.reason || "Retention snapshot automation skipped."}
                                        </Alert>
                                    ) : (
                                        <Alert severity="success">
                                            Rebuilt {retentionAutomation.rebuilt?.length || 0} monthly retention snapshots
                                            {" "}({retentionAutomation.rebuilt?.[0]?.month} to{" "}
                                            {retentionAutomation.rebuilt?.at(-1)?.month}).
                                        </Alert>
                                    )}
                                </Paper>
                            )}

                            {clientMetricsAutomation && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Client Metric Automation</h2>
                                    {clientMetricsAutomation.error ? (
                                        <Alert severity="warning">{clientMetricsAutomation.error}</Alert>
                                    ) : clientMetricsAutomation.skipped ? (
                                        <Alert severity="info">No client metric periods required rebuilding.</Alert>
                                    ) : (
                                        <Alert severity="success">
                                            Rebuilt {clientMetricsAutomation.monthly?.length || 0} monthly periods
                                            {" "}and {clientMetricsAutomation.weekly?.length || 0} weekly periods.
                                        </Alert>
                                    )}
                                </Paper>
                            )}

                            {scheduleAutomation && (
                                <Paper style={{ padding: "18px" }}>
                                    <h2 style={{ marginTop: 0 }}>Schedule Automation</h2>
                                    {scheduleAutomation.error ? (
                                        <Alert severity="warning">{scheduleAutomation.error}</Alert>
                                    ) : scheduleAutomation.skipped ? (
                                        <Alert severity="info">{scheduleAutomation.reason || "Schedule automation skipped."}</Alert>
                                    ) : (
                                        <>
                                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                                                <SummaryBox label="Date From" value={scheduleAutomation.date_range?.from} />
                                                <SummaryBox label="Date To" value={scheduleAutomation.date_range?.to} />
                                                <SummaryBox label="Expected Created" value={scheduleAutomation.expected_slots?.created || 0} />
                                                <SummaryBox label="Expected Updated" value={scheduleAutomation.expected_slots?.updated || 0} />
                                                <SummaryBox label="Expected Matched" value={scheduleAutomation.expected_slots?.matched || 0} />
                                                <SummaryBox label="Expected Missing" value={scheduleAutomation.expected_slots?.missing || 0} />
                                                <SummaryBox label="Manual Classes Created" value={scheduleAutomation.manual_classes?.manual_classes_created || 0} />
                                                <SummaryBox label="Schedule Matched" value={scheduleAutomation.scheduled_class_reconciliation?.classes_matched || 0} />
                                                <SummaryBox label="Schedule Missing" value={(scheduleAutomation.scheduled_class_reconciliation?.missing_classes_created || 0) + (scheduleAutomation.scheduled_class_reconciliation?.missing_classes_existing || 0)} />
                                                <SummaryBox label="Unexpected Classes" value={scheduleAutomation.scheduled_class_reconciliation?.unexpected_classes || 0} />
                                                <SummaryBox label="Attendance Matches" value={scheduleAutomation.attendance_matches?.matches_created || 0} />
                                                <SummaryBox label="Attendance Updated" value={scheduleAutomation.attendance_matches?.matches_updated || 0} />
                                                <SummaryBox label="Unmatched Attendance" value={scheduleAutomation.attendance_matches?.unmatched || 0} />
                                            </div>
                                            <Alert severity="info" style={{ marginTop: "16px" }}>
                                                Expected slots, scheduled class reconciliation, and attendance matches were rebuilt automatically for this report range.
                                            </Alert>
                                        </>
                                    )}
                                </Paper>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MainPage>
    );
}

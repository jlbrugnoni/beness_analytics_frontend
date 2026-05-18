import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
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


const formatDate = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


const parseDate = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};


const startOfWeek = (value) => {
    const dateValue = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const weekday = dateValue.getDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    dateValue.setDate(dateValue.getDate() - daysFromMonday);
    return dateValue;
};


const weekRange = (weekStart) => {
    const start = parseDate(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { date_from: weekStart, date_to: formatDate(end) };
};


const formatDisplayDate = (value) => {
    if (!value) return "N/A";
    return parseDate(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};


export default function UnmatchedAttendance() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [selectedClasses, setSelectedClasses] = useState({});
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [matchingId, setMatchingId] = useState(null);
    const [filters, setFilters] = useState({
        site: "",
        studio: "",
        weekStart: formatDate(startOfWeek(new Date())),
        match_method: "",
        search: "",
    });

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchAllPages = async (endpoint) => {
        let url = `${backendUrl}/api/data/${endpoint}/`;
        let nextRows = [];
        while (url) {
            const response = await axios.get(url, authHeaders);
            const pageRows = response.data.results || response.data;
            nextRows = [...nextRows, ...pageRows];
            url = normalizeApiNextUrl(response.data.next, backendUrl);
        }
        return nextRows;
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
        setSuccess("");
        try {
            const params = new URLSearchParams();
            const range = weekRange(filters.weekStart);
            const requestFilters = {
                site: filters.site,
                studio: filters.studio,
                match_method: filters.match_method,
                search: filters.search,
                ...range,
            };
            Object.entries(requestFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await axios.get(`${backendUrl}/api/data/analytics/class-matches/unresolved/?${params.toString()}`, authHeaders);
            setRows(response.data.rows || []);
            setCount(response.data.count || 0);
            setSelectedClasses({});
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || "Error loading unmatched attendance.");
        } finally {
            setLoading(false);
        }
    };

    const moveWeek = (days) => {
        const nextDate = parseDate(filters.weekStart);
        nextDate.setDate(nextDate.getDate() + days);
        setFilters({ ...filters, weekStart: formatDate(nextDate) });
    };

    const matchAttendance = async (row) => {
        const scheduledClass = selectedClasses[row.id];
        if (!scheduledClass) return;
        setMatchingId(row.id);
        setError("");
        setSuccess("");
        try {
            await axios.post(`${backendUrl}/api/data/analytics/class-matches/unresolved/`, {
                match: row.id,
                scheduled_class: scheduledClass,
            }, authHeaders);
            await fetchRows();
            setSuccess("Attendance matched successfully.");
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || "Error matching attendance.");
        } finally {
            setMatchingId(null);
        }
    };

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchRows();
    }, [token, filters.weekStart]);

    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const activeRange = weekRange(filters.weekStart);

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Unmatched Attendance</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Unmatched Attendance</h1>
                </div>

                <div style={{ width: "90%", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

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
                                value={filters.match_method}
                                onChange={(event) => setFilters({ ...filters, match_method: event.target.value })}
                            >
                                <MenuItem value="">Unmatched and Ambiguous</MenuItem>
                                <MenuItem value="unmatched">Unmatched</MenuItem>
                                <MenuItem value="ambiguous">Ambiguous</MenuItem>
                            </TextField>
                            <TextField
                                label="Week Starts"
                                type="date"
                                value={filters.weekStart}
                                InputLabelProps={{ shrink: true }}
                                onChange={(event) => setFilters({ ...filters, weekStart: formatDate(startOfWeek(parseDate(event.target.value))) })}
                            />
                            <TextField
                                label="Search"
                                value={filters.search}
                                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <Button variant="outlined" onClick={() => moveWeek(-7)}>Previous Week</Button>
                            <Button variant="outlined" onClick={() => setFilters({ ...filters, weekStart: formatDate(startOfWeek(new Date())) })}>This Week</Button>
                            <Button variant="outlined" onClick={() => moveWeek(7)}>Next Week</Button>
                            <Button variant="contained" onClick={fetchRows} disabled={loading}>
                                {loading ? "Loading..." : "Apply Filters"}
                            </Button>
                            <span style={{ color: "#666", fontSize: "14px" }}>
                                {formatDisplayDate(activeRange.date_from)} - {formatDisplayDate(activeRange.date_to)}
                            </span>
                        </div>
                    </Paper>

                    <Paper style={{ padding: "16px" }}>
                        <h2 style={{ marginTop: 0 }}>{count.toLocaleString()} unresolved attended visits</h2>
                        <TableContainer style={{ maxHeight: 640 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Attendance</TableCell>
                                        <TableCell>Client</TableCell>
                                        <TableCell>Studio</TableCell>
                                        <TableCell>Instructor</TableCell>
                                        <TableCell>Service</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Candidate Class</TableCell>
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <div>{formatDisplayDate(row.attendance_visit.date)}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>{row.attendance_visit.time}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div>{row.attendance_visit.client}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>{row.attendance_visit.client_mindbody_id || ""}</div>
                                            </TableCell>
                                            <TableCell>{row.attendance_visit.studio}</TableCell>
                                            <TableCell>{row.attendance_visit.instructor}</TableCell>
                                            <TableCell>{row.attendance_visit.service}</TableCell>
                                            <TableCell>
                                                <div>{row.match_method}</div>
                                                <div style={{ color: "#666", fontSize: "12px" }}>{row.notes || ""}</div>
                                            </TableCell>
                                            <TableCell style={{ minWidth: 280 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Candidate"
                                                    value={selectedClasses[row.id] || ""}
                                                    onChange={(event) => setSelectedClasses({
                                                        ...selectedClasses,
                                                        [row.id]: event.target.value,
                                                    })}
                                                    disabled={!row.candidates.length}
                                                >
                                                    <MenuItem value="">Select class</MenuItem>
                                                    {row.candidates.map((candidate) => (
                                                        <MenuItem key={candidate.id} value={candidate.id}>
                                                            {candidate.start_time} · {candidate.name} · {candidate.room} · {candidate.staff_member}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                                {!row.candidates.length && (
                                                    <div style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>No same-time candidate found.</div>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    disabled={!selectedClasses[row.id] || matchingId === row.id}
                                                    onClick={() => matchAttendance(row)}
                                                >
                                                    {matchingId === row.id ? "Matching..." : "Match"}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!rows.length && (
                                        <TableRow>
                                            <TableCell colSpan={8}>No unresolved attended visits found.</TableCell>
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

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";


const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusColors = {
    scheduled: { background: "#e7f3ec", border: "#72a987", color: "#24533a" },
    needs_review: { background: "#fff5df", border: "#e0ac42", color: "#79520c" },
    conflict: { background: "#fde8e8", border: "#df6b6b", color: "#7d1f1f" },
    cancelled: { background: "#f0f1f3", border: "#b6bcc4", color: "#4e5965" },
    unavailable: { background: "#e8edf7", border: "#7f96c8", color: "#2b477f" },
};

const expectedColors = {
    matched: { background: "#e7f3ec", border: "#72a987", color: "#24533a" },
    missing: { background: "#fde8e8", border: "#df6b6b", color: "#7d1f1f" },
    cancelled: { background: "#f0f1f3", border: "#b6bcc4", color: "#4e5965" },
    unavailable: { background: "#e8edf7", border: "#7f96c8", color: "#2b477f" },
    manually_created: { background: "#eaf4ff", border: "#5b93d3", color: "#1f4d7d" },
    ignored: { background: "#f7f7f7", border: "#cccccc", color: "#555555" },
};


const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


const parseDate = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};


const startOfWeek = (date) => {
    const next = new Date(date);
    const day = next.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    next.setDate(next.getDate() + mondayOffset);
    return next;
};


const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};


const shortTime = (value) => (value || "").slice(0, 5);


const fetchAll = async (url, authHeaders, params = {}) => {
    const rows = [];
    let nextUrl = url;
    let nextParams = params;

    while (nextUrl) {
        const response = await axios.get(nextUrl, { ...authHeaders, params: nextParams });
        const data = response.data;
        if (Array.isArray(data)) return data;
        rows.push(...(data.results || []));
        nextUrl = data.next;
        nextParams = {};
    }

    return rows;
};


const SummaryCard = ({ label, value }) => (
    <Paper style={{ padding: "14px", minHeight: "72px" }}>
        <div style={{ color: "#666", fontSize: "13px" }}>{label}</div>
        <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
    </Paper>
);


const ClassCard = ({ item }) => {
    const colors = statusColors[item.status] || statusColors.scheduled;
    return (
        <div
            style={{
                border: `1px solid ${colors.border}`,
                borderLeft: `5px solid ${colors.border}`,
                background: colors.background,
                color: colors.color,
                borderRadius: "8px",
                padding: "10px",
                display: "grid",
                gap: "6px",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
                <strong>{shortTime(item.start_time)}-{shortTime(item.end_time)}</strong>
                <span style={{ fontSize: "12px", textTransform: "capitalize" }}>{item.status?.replaceAll("_", " ")}</span>
            </div>
            <div style={{ fontWeight: 700 }}>{item.name}</div>
            <div style={{ fontSize: "13px" }}>{item.studio_name}</div>
            <div style={{ fontSize: "13px" }}>{item.room_name || "No room"} · {item.staff_member_name || "No instructor"}</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Chip size="small" label={`Cap. ${item.capacity || 0}`} />
                <Chip size="small" label={`Att. ${item.attended_count || 0}`} />
                {(item.no_show_count || item.late_cancel_count) ? (
                    <Chip size="small" label={`NS/LC ${(item.no_show_count || 0) + (item.late_cancel_count || 0)}`} />
                ) : null}
            </div>
            {item.reason && <div style={{ fontSize: "12px" }}>{item.reason}</div>}
        </div>
    );
};

const ExpectedSlotCard = ({ item, onCreateClass, onResolve }) => {
    const colors = expectedColors[item.status] || expectedColors.missing;
    const detectedStaff = item.scheduled_class_staff_member_name || item.staff_member_name;
    const attended = item.scheduled_class_attended_count || 0;
    const noShows = item.scheduled_class_no_show_count || 0;
    const lateCancels = item.scheduled_class_late_cancel_count || 0;
    const isResolvedAway = ["cancelled", "unavailable", "ignored"].includes(item.status);
    const hasDetectedClass = Boolean(item.scheduled_class);
    return (
        <div
            style={{
                border: `1px dashed ${colors.border}`,
                borderLeft: `5px solid ${colors.border}`,
                background: colors.background,
                color: colors.color,
                borderRadius: "8px",
                padding: "10px",
                display: "grid",
                gap: "6px",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
                <strong>{shortTime(item.start_time)}-{shortTime(item.end_time)}</strong>
                <span style={{ fontSize: "12px", textTransform: "capitalize" }}>{item.status?.replaceAll("_", " ")}</span>
            </div>
            <div style={{ fontWeight: 700 }}>{item.name}</div>
            <div style={{ fontSize: "13px" }}>{item.room_name} · Expected: {item.staff_member_name || "No fixed instructor"}</div>
            {hasDetectedClass && (
                <div style={{ fontSize: "13px" }}>
                    Detected: {item.scheduled_class_name} · {detectedStaff || "No instructor"}
                </div>
            )}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Chip size="small" label={`Cap. ${item.capacity || 0}`} />
                {hasDetectedClass && <Chip size="small" label={`Detected cap. ${item.scheduled_class_capacity || 0}`} />}
                {hasDetectedClass && <Chip size="small" label={`Att. ${attended}`} />}
                {hasDetectedClass && (noShows || lateCancels) ? (
                    <Chip size="small" label={`NS/LC ${noShows + lateCancels}`} />
                ) : null}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {!hasDetectedClass && item.status === "missing" && (
                    <Button size="small" variant="contained" onClick={() => onCreateClass(item)}>Create Class</Button>
                )}
                {!isResolvedAway && (
                    <>
                        <Button size="small" variant="outlined" onClick={() => onResolve(item, "cancelled")}>Cancel</Button>
                        <Button size="small" variant="outlined" onClick={() => onResolve(item, "unavailable")}>Unavailable</Button>
                    </>
                )}
                {!hasDetectedClass && item.status === "missing" && (
                    <Button size="small" variant="text" onClick={() => onResolve(item, "ignored")}>Ignore</Button>
                )}
                {isResolvedAway && (
                    <Button size="small" variant="outlined" onClick={() => onResolve(item, "missing")}>Reopen</Button>
                )}
            </div>
        </div>
    );
};


export default function SchedulePage() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [site, setSite] = useState("");
    const [studio, setStudio] = useState("");
    const [room, setRoom] = useState("");
    const [weekStart, setWeekStart] = useState(formatDate(startOfWeek(new Date())));
    const [classes, setClasses] = useState([]);
    const [expectedSlots, setExpectedSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [matching, setMatching] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [matchResult, setMatchResult] = useState(null);
    const [generateResult, setGenerateResult] = useState(null);
    const [error, setError] = useState("");

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const weekDays = useMemo(() => {
        const start = parseDate(weekStart);
        return Array.from({ length: 7 }, (_, index) => {
            const date = addDays(start, index);
            return {
                label: DAY_LABELS[index],
                date,
                value: formatDate(date),
            };
        });
    }, [weekStart]);

    useEffect(() => {
        const loadLookups = async () => {
            if (!token) return;
            const [siteRows, studioRows, roomRows] = await Promise.all([
                fetchAll(`${backendUrl}/api/data/sites/`, authHeaders),
                fetchAll(`${backendUrl}/api/data/studios/`, authHeaders),
                fetchAll(`${backendUrl}/api/data/rooms/`, authHeaders),
            ]);
            setSites(siteRows);
            setStudios(studioRows);
            setRooms(roomRows);
            if (!site && siteRows.length) setSite(siteRows[0].id);
        };

        loadLookups().catch((err) => setError(err.response?.data?.detail || "Error loading filters."));
    }, [token]);

    const loadClasses = async () => {
        if (!token || !site) return;
        setLoading(true);
        setError("");
        try {
            const params = {
                site,
                date_from: weekStart,
                date_to: weekDays[6].value,
            };
            if (studio) params.studio = studio;
            if (room) params.room = room;
            const rows = await fetchAll(`${backendUrl}/api/data/scheduled-classes/`, authHeaders, params);
            rows.sort((a, b) => `${a.class_date} ${a.start_time}`.localeCompare(`${b.class_date} ${b.start_time}`));
            setClasses(rows);

            const expectedParams = {
                site,
                date_from: weekStart,
                date_to: weekDays[6].value,
            };
            if (studio) expectedParams.studio = studio;
            if (room) expectedParams.room = room;
            const expectedRows = await fetchAll(`${backendUrl}/api/data/expected-class-slots/`, authHeaders, expectedParams);
            expectedRows.sort((a, b) => `${a.slot_date} ${a.start_time}`.localeCompare(`${b.slot_date} ${b.start_time}`));
            setExpectedSlots(expectedRows);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading schedule.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClasses();
    }, [token, site, studio, room, weekStart]);

    const handleGenerateExpectedSlots = async () => {
        if (!site) return;
        setGenerating(true);
        setError("");
        setGenerateResult(null);
        try {
            const payload = {
                site,
                date_from: weekStart,
                date_to: weekDays[6].value,
            };
            if (studio) payload.studio = studio;
            if (room) payload.room = room;
            const response = await axios.post(
                `${backendUrl}/api/data/expected-class-slots/generate/`,
                payload,
                authHeaders,
            );
            setGenerateResult(response.data);
            await loadClasses();
        } catch (err) {
            setError(err.response?.data?.error || "Error generating expected slots.");
        } finally {
            setGenerating(false);
        }
    };

    const handleRebuildMatches = async () => {
        if (!site) return;
        setMatching(true);
        setError("");
        setMatchResult(null);
        try {
            const response = await axios.post(
                `${backendUrl}/api/data/analytics/class-matches/rebuild/`,
                {
                    site,
                    date_from: weekStart,
                    date_to: weekDays[6].value,
                },
                authHeaders,
            );
            setMatchResult(response.data);
            await loadClasses();
        } catch (err) {
            setError(err.response?.data?.error || "Error rebuilding class matches.");
        } finally {
            setMatching(false);
        }
    };

    const handleCreateClassFromSlot = async (slot) => {
        if (!window.confirm("Create this scheduled class from the expected slot?")) return;
        setError("");
        try {
            await axios.post(
                `${backendUrl}/api/data/expected-class-slots/${slot.id}/create-scheduled-class/`,
                {},
                authHeaders,
            );
            await loadClasses();
        } catch (err) {
            setError(err.response?.data?.error || "Error creating scheduled class.");
        }
    };

    const handleResolveSlot = async (slot, statusValue) => {
        setError("");
        try {
            await axios.post(
                `${backendUrl}/api/data/expected-class-slots/${slot.id}/resolve/`,
                { status: statusValue },
                authHeaders,
            );
            await loadClasses();
        } catch (err) {
            setError(err.response?.data?.error || "Error resolving expected slot.");
        }
    };

    const filteredStudios = studios.filter((item) => !site || String(item.site) === String(site));
    const filteredRooms = rooms.filter((item) => {
        if (site && String(item.site) !== String(site)) return false;
        if (studio && String(item.studio) !== String(studio)) return false;
        return true;
    });
    const classesByDate = weekDays.reduce((acc, day) => {
        acc[day.value] = classes.filter((item) => item.class_date === day.value);
        return acc;
    }, {});
    const expectedByDate = weekDays.reduce((acc, day) => {
        acc[day.value] = expectedSlots.filter((item) => item.slot_date === day.value);
        return acc;
    }, {});
    const expectedScheduledClassIds = new Set(expectedSlots.map((item) => item.scheduled_class).filter(Boolean));
    const summary = classes.reduce((acc, item) => {
        acc.total += 1;
        acc.capacity += Number(item.capacity || 0);
        acc.attended += Number(item.attended_count || 0);
        acc.needsReview += item.status === "needs_review" ? 1 : 0;
        acc.conflicts += item.status === "conflict" ? 1 : 0;
        return acc;
    }, { total: 0, capacity: 0, attended: 0, needsReview: 0, conflicts: 0 });
    const expectedSummary = expectedSlots.reduce((acc, item) => {
        acc.total += 1;
        acc.matched += item.status === "matched" ? 1 : 0;
        acc.missing += item.status === "missing" ? 1 : 0;
        return acc;
    }, { total: 0, matched: 0, missing: 0 });
    const unexpectedCount = classes.filter((item) => !expectedScheduledClassIds.has(item.id)).length;

    const moveWeek = (days) => setWeekStart(formatDate(addDays(parseDate(weekStart), days)));

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Schedule</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Schedule</h1>
                </div>

                <div style={{ display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper style={{ padding: "18px", display: "grid", gap: "14px" }}>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                            <TextField select label="Site" value={site} onChange={(event) => {
                                setSite(event.target.value);
                                setStudio("");
                                setRoom("");
                            }}>
                                {sites.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField select label="Studio" value={studio} onChange={(event) => {
                                setStudio(event.target.value);
                                setRoom("");
                            }}>
                                <MenuItem value="">All studios</MenuItem>
                                {filteredStudios.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField select label="Room" value={room} onChange={(event) => setRoom(event.target.value)}>
                                <MenuItem value="">All rooms</MenuItem>
                                {filteredRooms.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Week Starts"
                                type="date"
                                value={weekStart}
                                onChange={(event) => setWeekStart(formatDate(startOfWeek(parseDate(event.target.value))))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <Button variant="outlined" onClick={() => moveWeek(-7)}>Previous Week</Button>
                            <Button variant="outlined" onClick={() => setWeekStart(formatDate(startOfWeek(new Date())))}>This Week</Button>
                            <Button variant="outlined" onClick={() => moveWeek(7)}>Next Week</Button>
                            <Link href="/data/scheduled-classes">
                                <Button variant="text">Manage Scheduled Classes</Button>
                            </Link>
                            <Link href="/data/weekly-room-templates">
                                <Button variant="text">Manage Templates</Button>
                            </Link>
                            <Link href="/schedule/templates">
                                <Button variant="contained" color="secondary">Visual Template Builder</Button>
                            </Link>
                            <Button variant="outlined" onClick={handleGenerateExpectedSlots} disabled={generating || !site}>
                                {generating ? "Generating..." : "Generate Expected Slots"}
                            </Button>
                            <Button variant="contained" onClick={handleRebuildMatches} disabled={matching || !site}>
                                {matching ? "Matching..." : "Rebuild Attendance Matches"}
                            </Button>
                        </div>
                    </Paper>

                    {matchResult && (
                        <Alert severity="success">
                            Matches rebuilt: {matchResult.exact_instructor_time} exact, {matchResult.single_class_same_time} by time, {matchResult.ambiguous} ambiguous, {matchResult.unmatched} unmatched.
                        </Alert>
                    )}

                    {generateResult && (
                        <Alert severity="success">
                            Expected slots generated: {generateResult.created} created, {generateResult.updated} updated, {generateResult.matched} matched, {generateResult.missing} missing.
                        </Alert>
                    )}

                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                        <SummaryCard label="Classes" value={summary.total} />
                        <SummaryCard label="Capacity" value={summary.capacity} />
                        <SummaryCard label="Attended" value={summary.attended} />
                        <SummaryCard label="Needs Review" value={summary.needsReview} />
                        <SummaryCard label="Conflicts" value={summary.conflicts} />
                        <SummaryCard label="Expected Slots" value={expectedSummary.total} />
                        <SummaryCard label="Missing Expected" value={expectedSummary.missing} />
                        <SummaryCard label="Unexpected Detected" value={unexpectedCount} />
                    </div>

                    {loading && <Alert severity="info">Loading schedule...</Alert>}

                    <div style={{
                        display: "grid",
                        gap: "12px",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        alignItems: "start",
                    }}>
                        {weekDays.map((day) => (
                            <Paper key={day.value} style={{ padding: "12px", minHeight: "260px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                                    <h2 style={{ margin: 0, fontSize: "18px" }}>{day.label}</h2>
                                    <span style={{ color: "#666", fontSize: "13px" }}>{day.value}</span>
                                </div>
                                <div style={{ display: "grid", gap: "10px" }}>
                                    {(expectedByDate[day.value] || []).map((item) => (
                                        <ExpectedSlotCard
                                            key={`expected-${item.id}`}
                                            item={item}
                                            onCreateClass={handleCreateClassFromSlot}
                                            onResolve={handleResolveSlot}
                                        />
                                    ))}
                                    {(classesByDate[day.value] || []).map((item) => (
                                        expectedScheduledClassIds.has(item.id) ? null : <ClassCard key={`detected-${item.id}`} item={item} />
                                    ))}
                                    {!classesByDate[day.value]?.length && !expectedByDate[day.value]?.length && (
                                        <div style={{ color: "#777", fontSize: "14px" }}>No classes</div>
                                    )}
                                </div>
                            </Paper>
                        ))}
                    </div>
                </div>
            </div>
        </MainPage>
    );
}

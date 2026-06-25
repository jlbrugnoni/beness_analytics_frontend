import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InfoIcon from "@mui/icons-material/Info";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";


const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const statusColors = {
    scheduled: { background: "#e7f3ec", border: "#72a987", color: "#24533a" },
    needs_review: { background: "#fff5df", border: "#e0ac42", color: "#79520c" },
    conflict: { background: "#fde8e8", border: "#df6b6b", color: "#7d1f1f" },
    cancelled: { background: "#f0f1f3", border: "#b6bcc4", color: "#4e5965" },
    unavailable: { background: "#e8edf7", border: "#7f96c8", color: "#2b477f" },
};

const scheduleStatusColors = {
    matched: { background: "#e7f3ec", border: "#72a987", color: "#24533a" },
    missing_from_report: { background: "#fff5df", border: "#e0ac42", color: "#79520c" },
    unexpected_from_report: { background: "#fde8e8", border: "#df6b6b", color: "#7d1f1f" },
    manual: { background: "#eaf4ff", border: "#5b93d3", color: "#1f4d7d" },
    unreconciled: { background: "#f7f7f7", border: "#cccccc", color: "#555555" },
};

const scheduleStatusOptions = [
    { value: "", labelKey: "schedule.allStatuses" },
    { value: "matched", labelKey: "schedule.status.matched" },
    { value: "missing_from_report", labelKey: "schedule.status.missing_from_report" },
    { value: "unexpected_from_report", labelKey: "schedule.status.unexpected_from_report" },
    { value: "unreconciled", labelKey: "schedule.status.unreconciled" },
    { value: "manual", labelKey: "schedule.status.manual" },
];


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


const fetchAll = async (url, authHeaders, params = {}, backendUrl) => {
    const rows = [];
    let nextUrl = url;
    let nextParams = params;

    while (nextUrl) {
        const response = await axios.get(nextUrl, { ...authHeaders, params: nextParams });
        const data = response.data;
        if (Array.isArray(data)) return data;
        rows.push(...(data.results || []));
        nextUrl = normalizeApiNextUrl(data.next, backendUrl || url);
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

const WarningCard = ({ label, value }) => (
    <Paper style={{ padding: "14px", minHeight: "72px", border: "1px solid #e0ac42", background: "#fff8ea" }}>
        <div style={{ color: "#79520c", fontSize: "13px" }}>{label}</div>
        <div style={{ color: "#79520c", fontSize: "24px", fontWeight: 700 }}>{value}</div>
    </Paper>
);


const ClassCard = ({ item, onResolve, onViewAttendance, canEditData, t }) => {
    const colors = scheduleStatusColors[item.schedule_status] || statusColors[item.status] || statusColors.scheduled;
    const scheduleLabel = item.schedule_status_label || item.schedule_status?.replaceAll("_", " ") || "Scheduled";
    const isClosed = ["cancelled", "unavailable"].includes(item.status);
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
                <span style={{ fontSize: "12px", textTransform: "capitalize" }}>{scheduleLabel}</span>
            </div>
            <div style={{ fontWeight: 700 }}>{item.name}</div>
            <div style={{ fontSize: "13px" }}>{item.studio_name}</div>
            <div style={{ fontSize: "13px" }}>{item.room_name || t("schedule.noRoom")} · {item.staff_member_name || t("schedule.noInstructor")}</div>
            {item.template_name && (
                <div style={{ fontSize: "12px" }}>Template: {item.template_name}</div>
            )}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Chip size="small" label={`Cap. ${item.capacity || 0}`} />
                <Chip size="small" label={`Att. ${item.attended_count || 0}`} />
                {(item.no_show_count || item.late_cancel_count) ? (
                    <Chip size="small" label={`NS/LC ${(item.no_show_count || 0) + (item.late_cancel_count || 0)}`} />
                ) : null}
                <Chip size="small" label={item.source_label || item.source || `${t("common.source")} N/A`} />
                {isClosed && <Chip size="small" color="warning" label={item.status?.replaceAll("_", " ")} />}
            </div>
            <div>
                <Button size="small" variant="text" onClick={() => onViewAttendance(item)}>
                    {t("schedule.viewAttendance")}
                </Button>
            </div>
            {item.reason && <div style={{ fontSize: "12px" }}>{item.reason}</div>}
            {canEditData && <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {!isClosed && (
                    <>
                        <Button size="small" variant="outlined" onClick={() => onResolve(item, "cancelled")}>{t("schedule.cancel")}</Button>
                        <Button size="small" variant="outlined" onClick={() => onResolve(item, "unavailable")}>{t("schedule.unavailable")}</Button>
                    </>
                )}
                {isClosed && (
                    <Button size="small" variant="outlined" onClick={() => onResolve(item, "scheduled")}>{t("schedule.reopen")}</Button>
                )}
            </div>}
        </div>
    );
};

export default function SchedulePage() {
    const token = useFetchToken();
    const access = useAccess();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const canEditData = Boolean(access.capabilities?.can_edit_data);

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [site, setSite] = useState("");
    const [studio, setStudio] = useState("");
    const [room, setRoom] = useState("");
    const [scheduleStatus, setScheduleStatus] = useState("");
    const [weekStart, setWeekStart] = useState(formatDate(startOfWeek(new Date())));
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [matching, setMatching] = useState(false);
    const [reconcilingClasses, setReconcilingClasses] = useState(false);
    const [syncingCapacity, setSyncingCapacity] = useState(false);
    const [matchResult, setMatchResult] = useState(null);
    const [classReconcileResult, setClassReconcileResult] = useState(null);
    const [capacitySyncResult, setCapacitySyncResult] = useState(null);
    const [attendanceClass, setAttendanceClass] = useState(null);
    const [attendanceRows, setAttendanceRows] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceInfoRow, setAttendanceInfoRow] = useState(null);
    const [error, setError] = useState("");

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const weekDays = useMemo(() => {
        const start = parseDate(weekStart);
        return Array.from({ length: 7 }, (_, index) => {
            const date = addDays(start, index);
            return {
                label: t(`weekdaysShort.${DAY_KEYS[index]}`),
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
            const rows = await fetchAll(`${backendUrl}/api/data/scheduled-classes/`, authHeaders, params, backendUrl);
            rows.sort((a, b) => `${a.class_date} ${a.start_time}`.localeCompare(`${b.class_date} ${b.start_time}`));
            setClasses(rows);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading schedule.");
        } finally {
            setLoading(false);
        }
    };

    const handleReconcileScheduledClasses = async () => {
        if (!site) return;
        setReconcilingClasses(true);
        setError("");
        setClassReconcileResult(null);
        try {
            const payload = {
                site,
                date_from: weekStart,
                date_to: weekDays[6].value,
            };
            if (studio) payload.studio = studio;
            if (room) payload.room = room;
            const response = await axios.post(
                `${backendUrl}/api/data/scheduled-classes/reconcile-from-templates/`,
                payload,
                authHeaders,
            );
            setClassReconcileResult(response.data);
            await loadClasses();
        } catch (err) {
            setError(err.response?.data?.error || "Error reconciling scheduled classes.");
        } finally {
            setReconcilingClasses(false);
        }
    };

    useEffect(() => {
        loadClasses();
    }, [token, site, studio, room, weekStart]);

    const handleRebuildMatches = async () => {
        if (!site) return;
        setMatching(true);
        setError("");
        setMatchResult(null);
        try {
            const payload = {
                site,
                date_from: weekStart,
                date_to: weekDays[6].value,
                repair_attendance_duplicates: true,
            };
            if (studio) payload.studio = studio;

            const response = await axios.post(
                `${backendUrl}/api/data/analytics/class-matches/rebuild/`,
                payload,
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

    const handleViewAttendance = async (scheduledClass) => {
        setAttendanceClass(scheduledClass);
        setAttendanceRows([]);
        setAttendanceInfoRow(null);
        setAttendanceLoading(true);
        setError("");
        try {
            const rows = await fetchAll(
                `${backendUrl}/api/data/attendance-class-matches/?scheduled_class=${scheduledClass.id}`,
                authHeaders,
            );
            setAttendanceRows(rows);
        } catch (err) {
            setError(err.response?.data?.error || "Error loading class attendance.");
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleSyncTemplateCapacities = async () => {
        if (!site) return;
        if (!window.confirm("Update active weekly templates in the current filters using each room's current capacity?")) return;
        setSyncingCapacity(true);
        setError("");
        setCapacitySyncResult(null);
        try {
            const payload = { site, active_only: true };
            if (studio) payload.studio = studio;
            if (room) payload.room = room;
            const response = await axios.post(
                `${backendUrl}/api/data/weekly-room-templates/sync-capacity-from-rooms/`,
                payload,
                authHeaders,
            );
            setCapacitySyncResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || "Error syncing template capacities.");
        } finally {
            setSyncingCapacity(false);
        }
    };

    const handleResolveClass = async (scheduledClass, statusValue) => {
        setError("");
        try {
            await axios.patch(
                `${backendUrl}/api/data/scheduled-classes/${scheduledClass.id}/`,
                { status: statusValue },
                authHeaders,
            );
            await loadClasses();
        } catch (err) {
            setError(err.response?.data?.error || "Error updating scheduled class.");
        }
    };

    const filteredStudios = studios.filter((item) => !site || String(item.site) === String(site));
    const filteredRooms = rooms.filter((item) => {
        if (site && String(item.site) !== String(site)) return false;
        if (studio && String(item.studio) !== String(studio)) return false;
        return true;
    });
    const visibleClasses = scheduleStatus
        ? classes.filter((item) => item.schedule_status === scheduleStatus)
        : classes;
    const classesByDate = weekDays.reduce((acc, day) => {
        acc[day.value] = visibleClasses.filter((item) => item.class_date === day.value);
        return acc;
    }, {});
    const summary = visibleClasses.reduce((acc, item) => {
        acc.total += 1;
        acc.capacity += Number(item.capacity || 0);
        acc.attended += Number(item.attended_count || 0);
        acc.needsReview += item.status === "needs_review" ? 1 : 0;
        acc.conflicts += item.status === "conflict" ? 1 : 0;
        acc.matched += item.schedule_status === "matched" ? 1 : 0;
        acc.missing += item.schedule_status === "missing_from_report" ? 1 : 0;
        acc.unexpected += item.schedule_status === "unexpected_from_report" ? 1 : 0;
        acc.unreconciled += item.schedule_status === "unreconciled" ? 1 : 0;
        if (
            item.expected_from_template
            && Number(item.attended_count || 0) === 0
            && Number(item.no_show_count || 0) === 0
            && Number(item.late_cancel_count || 0) === 0
        ) {
            acc.zeroMatchedAttendance += 1;
        }
        return acc;
    }, { total: 0, capacity: 0, attended: 0, needsReview: 0, conflicts: 0, matched: 0, missing: 0, unexpected: 0, unreconciled: 0, zeroMatchedAttendance: 0 });

    const moveWeek = (days) => setWeekStart(formatDate(addDays(parseDate(weekStart), days)));

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("schedule.title")}</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>{t("schedule.title")}</h1>
                </div>

                <div style={{ display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper style={{ padding: "18px", display: "grid", gap: "14px" }}>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                            <TextField select label={t("common.site")} value={site} onChange={(event) => {
                                setSite(event.target.value);
                                setStudio("");
                                setRoom("");
                            }}>
                                {sites.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField select label={t("common.studio")} value={studio} onChange={(event) => {
                                setStudio(event.target.value);
                                setRoom("");
                            }}>
                                <MenuItem value="">{t("schedule.allStudios")}</MenuItem>
                                {filteredStudios.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField select label={t("common.room", "Room")} value={room} onChange={(event) => setRoom(event.target.value)}>
                                <MenuItem value="">{t("schedule.allRooms")}</MenuItem>
                                {filteredRooms.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField select label={t("schedule.status")} value={scheduleStatus} onChange={(event) => setScheduleStatus(event.target.value)}>
                                {scheduleStatusOptions.map((item) => (
                                    <MenuItem key={item.value || "all"} value={item.value}>{t(item.labelKey)}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label={t("schedule.weekStarts")}
                                type="date"
                                value={weekStart}
                                onChange={(event) => setWeekStart(formatDate(startOfWeek(parseDate(event.target.value))))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <Button variant="outlined" onClick={() => moveWeek(-7)}>{t("schedule.previousWeek")}</Button>
                            <Button variant="outlined" onClick={() => setWeekStart(formatDate(startOfWeek(new Date())))}>{t("schedule.thisWeek")}</Button>
                            <Button variant="outlined" onClick={() => moveWeek(7)}>{t("schedule.nextWeek")}</Button>
                            {canEditData && (
                                <>
                                    <Link href="/data/scheduled-classes">
                                        <Button variant="text">{t("schedule.manageScheduledClasses")}</Button>
                                    </Link>
                                    <Link href="/data/weekly-room-templates">
                                        <Button variant="text">{t("schedule.manageTemplates")}</Button>
                                    </Link>
                                    <Link href="/schedule/templates">
                                        <Button variant="contained" color="secondary">{t("schedule.templateBuilder")}</Button>
                                    </Link>
                                    <Link href="/schedule/unmatched-attendance">
                                        <Button variant="outlined">{t("schedule.reviewUnmatched")}</Button>
                                    </Link>
                                    <Button variant="outlined" onClick={handleReconcileScheduledClasses} disabled={reconcilingClasses || !site}>
                                        {reconcilingClasses ? t("schedule.reconciling") : t("schedule.reconcileClasses")}
                                    </Button>
                                    <Button variant="contained" onClick={handleRebuildMatches} disabled={matching || !site}>
                                        {matching ? t("schedule.matching") : t("schedule.rebuildMatches")}
                                    </Button>
                                    <Button variant="outlined" onClick={handleSyncTemplateCapacities} disabled={syncingCapacity || !site}>
                                        {syncingCapacity ? t("schedule.updating") : t("schedule.syncCapacities")}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Paper>

                    {matchResult && (
                        <Alert severity="success">
                            {t("schedule.attendanceSyncComplete")}{" "}
                            {matchResult.attendance_duplicate_repair && (
                                <>
                                    {t("schedule.attendanceRepairSummary")}{" "}
                                    {matchResult.attendance_duplicate_repair.duplicate_visits_deleted || 0}{" "}
                                    {t("schedule.attendanceDuplicatesRemoved")},{" "}
                                    {matchResult.attendance_duplicate_repair.stale_natural_keys_updated || 0}{" "}
                                    {t("schedule.attendanceKeysUpdated")}.{" "}
                                </>
                            )}
                            {t("schedule.matchesRebuiltSummary")} {matchResult.exact_instructor_time}{" "}
                            {t("schedule.matchesExact")}, {matchResult.single_class_same_time}{" "}
                            {t("schedule.matchesByTime")}, {matchResult.ambiguous}{" "}
                            {t("schedule.matchesAmbiguous")}, {matchResult.unmatched}{" "}
                            {t("schedule.matchesUnmatched")}.
                        </Alert>
                    )}

                    {classReconcileResult && (
                        <Alert severity="success">
                            Scheduled classes reconciled: {classReconcileResult.classes_matched} matched, {(classReconcileResult.missing_classes_created || 0) + (classReconcileResult.missing_classes_existing || 0)} missing, {classReconcileResult.unexpected_classes} unexpected.
                        </Alert>
                    )}

                    {capacitySyncResult && (
                        <Alert severity="success">
                            Template capacities updated: {capacitySyncResult.updated}. Skipped without room capacity: {capacitySyncResult.skipped_without_capacity}.
                        </Alert>
                    )}

                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                        <SummaryCard label={t("schedule.classes")} value={summary.total} />
                        <SummaryCard label={t("common.capacity")} value={summary.capacity} />
                        <SummaryCard label={t("schedule.attended")} value={summary.attended} />
                        <SummaryCard label={t("schedule.needsReview")} value={summary.needsReview} />
                        <SummaryCard label={t("schedule.conflicts")} value={summary.conflicts} />
                        <SummaryCard label={t("schedule.matchedSchedule")} value={summary.matched} />
                        <SummaryCard label={t("schedule.missingFromReport")} value={summary.missing} />
                        <SummaryCard label={t("schedule.unexpectedFromReport")} value={summary.unexpected} />
                        {summary.unreconciled > 0 && (
                            <WarningCard label={t("schedule.unreconciled")} value={summary.unreconciled} />
                        )}
                        {summary.zeroMatchedAttendance > 0 && (
                            <WarningCard label={t("schedule.zeroAttendance")} value={summary.zeroMatchedAttendance} />
                        )}
                    </div>

                    {(summary.unreconciled > 0 || summary.zeroMatchedAttendance > 0) && (
                        <Alert severity="warning">
                            Review highlighted schedule cards before trusting occupancy. Unreconciled classes need template reconciliation; zero attendance usually means attendance matches need to be rebuilt or the MindBody attendance time/studio does not align with the scheduled class.
                        </Alert>
                    )}

                    {loading && <Alert severity="info">{t("schedule.loading")}</Alert>}

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
                                    {(classesByDate[day.value] || []).map((item) => (
                                        <ClassCard
                                            key={`class-${item.id}`}
                                            item={item}
                                            onResolve={handleResolveClass}
                                            onViewAttendance={handleViewAttendance}
                                            canEditData={canEditData}
                                            t={t}
                                        />
                                    ))}
                                    {!classesByDate[day.value]?.length && (
                                        <div style={{ color: "#777", fontSize: "14px" }}>{t("schedule.noClasses")}</div>
                                    )}
                                </div>
                            </Paper>
                        ))}
                    </div>
                </div>
            </div>
            <Dialog
                open={Boolean(attendanceClass)}
                onClose={() => setAttendanceClass(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {t("schedule.classAttendance")} · {attendanceClass?.name} ·{" "}
                    {attendanceClass ? `${attendanceClass.class_date} ${shortTime(attendanceClass.start_time)}` : ""}
                </DialogTitle>
                <DialogContent>
                    {attendanceLoading && <Alert severity="info">{t("schedule.loadingAttendance")}</Alert>}
                    {!attendanceLoading && attendanceRows.length === 0 && (
                        <Alert severity="info">{t("schedule.noAttendanceForClass")}</Alert>
                    )}
                    {!attendanceLoading && attendanceRows.length > 0 && (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("schedule.client")}</TableCell>
                                    <TableCell>{t("schedule.mindbodyId")}</TableCell>
                                    <TableCell>{t("schedule.attendanceTime")}</TableCell>
                                    <TableCell>{t("schedule.pricingOption")}</TableCell>
                                    <TableCell>{t("schedule.instructor")}</TableCell>
                                    <TableCell align="center">{t("schedule.details")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attendanceRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.client_name || "N/A"}</TableCell>
                                        <TableCell>{row.client_mindbody_id || "N/A"}</TableCell>
                                        <TableCell>{row.attendance_time || "N/A"}</TableCell>
                                        <TableCell>{row.pricing_option_name || "N/A"}</TableCell>
                                        <TableCell>{row.staff_member_name || "N/A"}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={t("schedule.viewSourceDetails")}>
                                                <IconButton size="small" onClick={() => setAttendanceInfoRow(row)}>
                                                    <InfoIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(attendanceInfoRow)}
                onClose={() => setAttendanceInfoRow(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{t("schedule.attendanceSourceDetails")}</DialogTitle>
                <DialogContent>
                    <div style={{ display: "grid", gap: "10px", fontSize: "14px" }}>
                        <div>
                            <strong>{t("schedule.client")}:</strong>{" "}
                            {attendanceInfoRow?.client_name || "N/A"}
                        </div>
                        <div>
                            <strong>{t("common.source")}:</strong>{" "}
                            {attendanceInfoRow?.source_file_name || "N/A"}
                            {attendanceInfoRow?.source_import_id ? ` (#${attendanceInfoRow.source_import_id})` : ""}
                        </div>
                        <div>
                            <strong>{t("schedule.matchMethod")}:</strong>{" "}
                            {attendanceInfoRow?.match_method?.replaceAll("_", " ") || "N/A"}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </MainPage>
    );
}

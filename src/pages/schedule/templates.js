import Head from "next/head";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import DeleteIcon from "@mui/icons-material/Delete";


const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const START_HOUR = 6;
const END_HOUR = 22;


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


const formatTime = (hour, minute = 0) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
const shortTime = (value) => (value || "").slice(0, 5);
const addMinutes = (time, minutes) => {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date(2000, 0, 1, hour, minute + minutes);
    return formatTime(date.getHours(), date.getMinutes());
};
const slotKey = (item) => `${item.weekday}-${shortTime(item.start_time)}`;
const rowTimes = Array.from({ length: (END_HOUR - START_HOUR) * 2 }, (_, index) => {
    const hour = START_HOUR + Math.floor(index / 2);
    const minute = index % 2 === 0 ? 0 : 30;
    return formatTime(hour, minute);
});


const TemplateBlock = ({ item, draft = false, onDelete }) => (
    <div
        style={{
            border: `1px solid ${draft ? "#e0ac42" : "#72a987"}`,
            borderLeft: `5px solid ${draft ? "#e0ac42" : "#2f6f73"}`,
            background: draft ? "#fff5df" : "#e7f3ec",
            color: draft ? "#79520c" : "#24533a",
            borderRadius: "8px",
            padding: "9px",
            display: "grid",
            gap: "5px",
        }}
    >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
            <strong>{shortTime(item.start_time)}-{shortTime(item.end_time)}</strong>
            <Button
                size="small"
                color="error"
                onClick={() => onDelete(item)}
                style={{ minWidth: 32, padding: 4 }}
                title={draft ? "Remove draft block" : "Delete template"}
            >
                <DeleteIcon fontSize="small" />
            </Button>
        </div>
        <div style={{ fontWeight: 700 }}>{item.name}</div>
        <div style={{ fontSize: "13px" }}>{item.staff_member_name || item.staff_label || "No fixed instructor"}</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Chip size="small" label={`Cap. ${item.capacity || 0}`} />
            <Chip size="small" label={draft ? "Draft" : "Saved"} />
        </div>
    </div>
);


export default function WeeklyTemplateBuilder() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [draftBlocks, setDraftBlocks] = useState([]);
    const [site, setSite] = useState("");
    const [studio, setStudio] = useState("");
    const [room, setRoom] = useState("");
    const [staffMember, setStaffMember] = useState("");
    const [className, setClassName] = useState("Pilates");
    const [duration, setDuration] = useState(55);
    const [capacity, setCapacity] = useState(10);
    const [activeFrom, setActiveFrom] = useState(new Date().toISOString().slice(0, 10));
    const [activeUntil, setActiveUntil] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    useEffect(() => {
        const loadLookups = async () => {
            if (!token) return;
            const [siteRows, studioRows, roomRows, staffRows] = await Promise.all([
                fetchAll(`${backendUrl}/api/data/sites/`, authHeaders),
                fetchAll(`${backendUrl}/api/data/studios/`, authHeaders),
                fetchAll(`${backendUrl}/api/data/rooms/`, authHeaders),
                fetchAll(`${backendUrl}/api/data/staff-members/`, authHeaders),
            ]);
            setSites(siteRows);
            setStudios(studioRows);
            setRooms(roomRows);
            setStaffMembers(staffRows);
            if (!site && siteRows.length) setSite(siteRows[0].id);
        };

        loadLookups().catch((err) => setError(err.response?.data?.detail || "Error loading lookups."));
    }, [token]);

    const filteredStudios = studios.filter((item) => !site || String(item.site) === String(site));
    const filteredRooms = rooms.filter((item) => {
        if (site && String(item.site) !== String(site)) return false;
        if (studio && String(item.studio) !== String(studio)) return false;
        return true;
    });
    const filteredStaff = staffMembers.filter((item) => !site || String(item.site) === String(site));
    const selectedStaff = filteredStaff.find((item) => String(item.id) === String(staffMember));

    const loadTemplates = async () => {
        if (!token || !site) return;
        const params = { site, active: "true" };
        if (studio) params.studio = studio;
        if (room) params.room = room;
        const rows = await fetchAll(`${backendUrl}/api/data/weekly-room-templates/`, authHeaders, params);
        rows.sort((a, b) => `${a.weekday} ${a.start_time}`.localeCompare(`${b.weekday} ${b.start_time}`));
        setTemplates(rows);
    };

    useEffect(() => {
        setDraftBlocks([]);
        loadTemplates().catch((err) => setError(err.response?.data?.detail || "Error loading templates."));
    }, [token, site, studio, room]);

    const hasBlockAt = (weekday, startTime) => {
        const key = `${weekday}-${startTime}`;
        return [...templates, ...draftBlocks].some((item) => slotKey(item) === key);
    };

    const addDraftBlock = (weekday, startTime) => {
        if (!site || !studio || !room) {
            setError("Select site, studio and room before creating blocks.");
            return;
        }
        if (hasBlockAt(weekday, startTime)) {
            setError("That room already has a block at this weekday and start time.");
            return;
        }
        setError("");
        setDraftBlocks((current) => [
            ...current,
            {
                draft_id: `${weekday}-${startTime}-${Date.now()}`,
                site,
                studio,
                room,
                staff_member: staffMember || null,
                staff_label: selectedStaff?.name || "",
                name: className || "Pilates",
                weekday,
                start_time: startTime,
                end_time: addMinutes(startTime, Number(duration || 55)),
                capacity: Number(capacity || 0),
                active_from: activeFrom,
                active_until: activeUntil || null,
                active: true,
            },
        ]);
    };

    const removeDraftBlock = (item) => {
        setDraftBlocks((current) => current.filter((row) => row.draft_id !== item.draft_id));
    };

    const deleteTemplate = async (item) => {
        if (!window.confirm("Delete this saved weekly block?")) return;
        await axios.delete(`${backendUrl}/api/data/weekly-room-templates/${item.id}/`, authHeaders);
        await loadTemplates();
    };

    const saveDraftBlocks = async () => {
        if (!draftBlocks.length) return;
        if (!activeFrom) {
            setError("Select Active From before saving the schedule.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await Promise.all(draftBlocks.map((item) => axios.post(`${backendUrl}/api/data/weekly-room-templates/`, {
                site: item.site,
                studio: item.studio,
                room: item.room,
                staff_member: item.staff_member || null,
                name: item.name,
                weekday: item.weekday,
                start_time: shortTime(item.start_time),
                end_time: shortTime(item.end_time),
                capacity: item.capacity,
                active_from: activeFrom,
                active_until: activeUntil || null,
                active: true,
            }, authHeaders)));
            setDraftBlocks([]);
            await loadTemplates();
        } catch (err) {
            setError(JSON.stringify(err.response?.data || "Error saving schedule."));
        } finally {
            setSaving(false);
        }
    };

    const copyDayToDraft = (fromWeekday, toWeekday) => {
        if (fromWeekday === toWeekday) return;
        const source = [...templates, ...draftBlocks].filter((item) => Number(item.weekday) === Number(fromWeekday));
        const nextDrafts = [];
        const existingKeys = new Set([...templates, ...draftBlocks].map(slotKey));
        source.forEach((item) => {
            const key = `${toWeekday}-${shortTime(item.start_time)}`;
            if (existingKeys.has(key)) return;
            nextDrafts.push({
                ...item,
                id: undefined,
                draft_id: `copy-${toWeekday}-${item.start_time}-${Date.now()}-${nextDrafts.length}`,
                weekday: toWeekday,
                staff_label: item.staff_member_name || item.staff_label || "",
            });
            existingKeys.add(key);
        });
        if (!nextDrafts.length) {
            setError("No blocks copied because the destination already has those start times.");
            return;
        }
        setError("");
        setDraftBlocks((current) => [...current, ...nextDrafts]);
    };

    const blocksBySlot = useMemo(() => {
        const grouped = {};
        [...templates, ...draftBlocks].forEach((item) => {
            const key = `${item.weekday}-${shortTime(item.start_time)}`;
            grouped[key] = [...(grouped[key] || []), item];
        });
        return grouped;
    }, [templates, draftBlocks]);

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Weekly Template Builder</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Weekly Template Builder</h1>
                </div>

                <div style={{ display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {draftBlocks.length > 0 && (
                        <Alert severity="info">
                            {draftBlocks.length} draft blocks ready. They are not saved until you click Save Schedule.
                        </Alert>
                    )}

                    <Paper style={{ padding: "18px", display: "grid", gap: "14px" }}>
                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                            <TextField select label="Site" value={site} onChange={(event) => {
                                setSite(event.target.value);
                                setStudio("");
                                setRoom("");
                            }}>
                                {sites.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                            </TextField>
                            <TextField select label="Studio" value={studio} onChange={(event) => {
                                setStudio(event.target.value);
                                setRoom("");
                            }}>
                                <MenuItem value="">Select studio</MenuItem>
                                {filteredStudios.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                            </TextField>
                            <TextField select label="Room" value={room} onChange={(event) => setRoom(event.target.value)}>
                                <MenuItem value="">Select room</MenuItem>
                                {filteredRooms.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                            </TextField>
                            <TextField select label="Expected Instructor" value={staffMember} onChange={(event) => setStaffMember(event.target.value)}>
                                <MenuItem value="">No fixed instructor</MenuItem>
                                {filteredStaff.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                            </TextField>
                        </div>

                        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                            <TextField label="Class Name" value={className} onChange={(event) => setClassName(event.target.value)} />
                            <TextField label="Duration" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} />
                            <TextField label="Capacity" type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
                            <TextField label="Active From" type="date" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
                            <TextField label="Active Until" type="date" value={activeUntil} onChange={(event) => setActiveUntil(event.target.value)} InputLabelProps={{ shrink: true }} />
                        </div>

                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <Button variant="contained" onClick={saveDraftBlocks} disabled={saving || draftBlocks.length === 0}>
                                {saving ? "Saving..." : `Save Schedule (${draftBlocks.length})`}
                            </Button>
                            <Button variant="outlined" color="error" onClick={() => setDraftBlocks([])} disabled={!draftBlocks.length}>
                                Clear Draft
                            </Button>
                            <Link href="/schedule">
                                <Button variant="outlined">Back To Schedule</Button>
                            </Link>
                            <Link href="/data/weekly-room-templates">
                                <Button variant="text">Open Table View</Button>
                            </Link>
                        </div>
                    </Paper>

                    <Paper style={{ padding: "12px", overflowX: "auto" }}>
                        <div style={{ minWidth: "1120px", display: "grid", gridTemplateColumns: "74px repeat(7, minmax(140px, 1fr))", gap: "8px" }}>
                            <div />
                            {DAY_LABELS.map((label, weekday) => (
                                <div key={label} style={{ display: "grid", gap: "8px" }}>
                                    <strong>{label}</strong>
                                    <TextField
                                        select
                                        size="small"
                                        label="Copy from"
                                        value=""
                                        onChange={(event) => copyDayToDraft(Number(event.target.value), weekday)}
                                    >
                                        {DAY_LABELS.map((option, index) => (
                                            <MenuItem key={option} value={index} disabled={index === weekday}>{option}</MenuItem>
                                        ))}
                                    </TextField>
                                </div>
                            ))}

                            {rowTimes.map((time) => (
                                <Fragment key={`row-${time}`}>
                                    <div style={{ fontWeight: 700, paddingTop: "12px" }}>{time}</div>
                                    {DAY_LABELS.map((_, weekday) => {
                                        const key = `${weekday}-${time}`;
                                        const cellBlocks = blocksBySlot[key] || [];
                                        return (
                                            <div
                                                key={`${weekday}-${time}`}
                                                style={{
                                                    minHeight: "112px",
                                                    border: "1px solid #dde2e6",
                                                    borderRadius: "8px",
                                                    padding: "8px",
                                                    display: "grid",
                                                    alignContent: "start",
                                                    gap: "8px",
                                                    background: "#fbfcfd",
                                                }}
                                            >
                                                {cellBlocks.map((item) => (
                                                    <TemplateBlock
                                                        key={item.id || item.draft_id}
                                                        item={item}
                                                        draft={!item.id}
                                                        onDelete={item.id ? deleteTemplate : removeDraftBlock}
                                                    />
                                                ))}
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    disabled={saving || !site || !studio || !room || cellBlocks.length > 0}
                                                    onClick={() => addDraftBlock(weekday, time)}
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </Fragment>
                            ))}
                        </div>
                    </Paper>
                </div>
            </div>
        </MainPage>
    );
}

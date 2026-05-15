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


const timeFromHour = (hour) => `${String(hour).padStart(2, "0")}:00`;
const addMinutes = (time, minutes) => {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date(2000, 0, 1, hour, minute + minutes);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const shortTime = (value) => (value || "").slice(0, 5);


const TemplateBlock = ({ item, onDelete }) => (
    <div
        style={{
            border: "1px solid #72a987",
            borderLeft: "5px solid #2f6f73",
            background: "#e7f3ec",
            color: "#24533a",
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
                onClick={() => onDelete(item.id)}
                style={{ minWidth: 32, padding: 4 }}
                title="Delete template"
            >
                <DeleteIcon fontSize="small" />
            </Button>
        </div>
        <div style={{ fontWeight: 700 }}>{item.name}</div>
        <div style={{ fontSize: "13px" }}>{item.staff_member_name || "No expected instructor"}</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Chip size="small" label={`Cap. ${item.capacity || 0}`} />
            <Chip size="small" label={item.active_until ? `${item.active_from} to ${item.active_until}` : `From ${item.active_from}`} />
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
    const [site, setSite] = useState("");
    const [studio, setStudio] = useState("");
    const [room, setRoom] = useState("");
    const [staffMember, setStaffMember] = useState("");
    const [className, setClassName] = useState("Pilates");
    const [duration, setDuration] = useState(50);
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
        loadTemplates().catch((err) => setError(err.response?.data?.detail || "Error loading templates."));
    }, [token, site, studio, room]);

    const createTemplate = async (weekday, startTime) => {
        if (!site || !studio || !room) {
            setError("Select site, studio and room before creating blocks.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await axios.post(`${backendUrl}/api/data/weekly-room-templates/`, {
                site,
                studio,
                room,
                staff_member: staffMember || null,
                name: className || "Pilates",
                weekday,
                start_time: startTime,
                end_time: addMinutes(startTime, Number(duration || 50)),
                capacity: Number(capacity || 0),
                active_from: activeFrom,
                active_until: activeUntil || null,
                active: true,
            }, authHeaders);
            await loadTemplates();
        } catch (err) {
            setError(JSON.stringify(err.response?.data || "Error creating template."));
        } finally {
            setSaving(false);
        }
    };

    const deleteTemplate = async (id) => {
        if (!window.confirm("Delete this weekly block?")) return;
        await axios.delete(`${backendUrl}/api/data/weekly-room-templates/${id}/`, authHeaders);
        await loadTemplates();
    };

    const copyDay = async (fromWeekday, toWeekday) => {
        if (fromWeekday === toWeekday) return;
        const source = templates.filter((item) => Number(item.weekday) === Number(fromWeekday));
        if (!source.length) return;
        setSaving(true);
        setError("");
        try {
            await Promise.all(source.map((item) => axios.post(`${backendUrl}/api/data/weekly-room-templates/`, {
                site: item.site,
                studio: item.studio,
                room: item.room,
                staff_member: item.staff_member || null,
                name: item.name,
                weekday: toWeekday,
                start_time: shortTime(item.start_time),
                end_time: shortTime(item.end_time),
                capacity: item.capacity,
                active_from: item.active_from,
                active_until: item.active_until || null,
                active: true,
            }, authHeaders)));
            await loadTemplates();
        } catch (err) {
            setError(JSON.stringify(err.response?.data || "Error copying day."));
        } finally {
            setSaving(false);
        }
    };

    const templatesByDayHour = useMemo(() => {
        const grouped = {};
        templates.forEach((item) => {
            const hour = Number(shortTime(item.start_time).split(":")[0]);
            const key = `${item.weekday}-${hour}`;
            grouped[key] = [...(grouped[key] || []), item];
        });
        return grouped;
    }, [templates]);

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
                            <Link href="/schedule">
                                <Button variant="outlined">Back To Schedule</Button>
                            </Link>
                            <Link href="/data/weekly-room-templates">
                                <Button variant="text">Open Table View</Button>
                            </Link>
                        </div>
                    </Paper>

                    <Paper style={{ padding: "12px", overflowX: "auto" }}>
                        <div style={{ minWidth: "1050px", display: "grid", gridTemplateColumns: "74px repeat(7, minmax(130px, 1fr))", gap: "8px" }}>
                            <div />
                            {DAY_LABELS.map((label, weekday) => (
                                <div key={label} style={{ display: "grid", gap: "8px" }}>
                                    <strong>{label}</strong>
                                    <TextField
                                        select
                                        size="small"
                                        label="Copy from"
                                        value=""
                                        onChange={(event) => copyDay(Number(event.target.value), weekday)}
                                    >
                                        {DAY_LABELS.map((option, index) => (
                                            <MenuItem key={option} value={index} disabled={index === weekday}>{option}</MenuItem>
                                        ))}
                                    </TextField>
                                </div>
                            ))}

                            {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index).map((hour) => (
                                <Fragment key={`row-${hour}`}>
                                    <div style={{ fontWeight: 700, paddingTop: "12px" }}>{timeFromHour(hour)}</div>
                                    {DAY_LABELS.map((_, weekday) => {
                                        const key = `${weekday}-${hour}`;
                                        const cellTemplates = templatesByDayHour[key] || [];
                                        return (
                                            <div
                                                key={`${weekday}-${hour}`}
                                                style={{
                                                    minHeight: "118px",
                                                    border: "1px solid #dde2e6",
                                                    borderRadius: "8px",
                                                    padding: "8px",
                                                    display: "grid",
                                                    alignContent: "start",
                                                    gap: "8px",
                                                    background: "#fbfcfd",
                                                }}
                                            >
                                                {cellTemplates.map((item) => (
                                                    <TemplateBlock key={item.id} item={item} onDelete={deleteTemplate} />
                                                ))}
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    disabled={saving || !site || !studio || !room}
                                                    onClick={() => createTemplate(weekday, timeFromHour(hour))}
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

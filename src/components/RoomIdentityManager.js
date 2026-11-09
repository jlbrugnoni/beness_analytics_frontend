import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";
import { fetchApiRows } from "@/utils/fetchApiRows";

export default function RoomIdentityManager({ site, token, preview, onChanged }) {
    const { t } = useI18n();
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [rooms, setRooms] = useState([]);
    const [target, setTarget] = useState("");
    const [source, setSource] = useState("");
    const [name, setName] = useState("");
    const [aliasName, setAliasName] = useState("");
    const [choices, setChoices] = useState({});
    const [plan, setPlan] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const config = useMemo(() => ({ headers: { Authorization: `Token ${token}` } }), [token]);
    const load = () => fetchApiRows(`${backend}/api/data/rooms/?site=${site}`, config, backend).then((rows) => setRooms(rows.filter((room) => room.active)));
    useEffect(() => {
        setRooms([]); setTarget(""); setSource(""); setPlan(null); setName(""); setError(""); setSuccess(""); setChoices({});
        if (!site || !token) return;
        let active = true;
        fetchApiRows(`${backend}/api/data/rooms/?site=${site}`, config, backend)
            .then((rows) => { if (active) setRooms(rows.filter((room) => room.active)); })
            .catch(() => { if (active) setError(t("roomIdentity.error")); });
        return () => { active = false; };
    }, [site, token, backend, config, t]);
    const selected = rooms.find((room) => room.id === Number(target));
    const run = async (action) => {
        setBusy(true); setError(""); setSuccess("");
        try { await action(); }
        catch (err) {
            const data = err.response?.data;
            setError(typeof data === "string" ? data : data?.detail || (Array.isArray(data) ? data.join(" ") : JSON.stringify(data || t("roomIdentity.error"))));
        } finally { setBusy(false); }
    };
    const saveAlias = (room, alias, displayName) => run(async () => {
        await axios.post(`${backend}/api/data/rooms/${room}/aliases/`, { name: alias, display_name: displayName || undefined }, config);
        setPlan(null); setAliasName(""); await load(); await onChanged?.(); setSuccess(t("roomIdentity.saved"));
    });
    const consolidate = (apply) => run(async () => {
        const { data } = await axios.post(`${backend}/api/data/rooms/${target}/consolidate/`, {
            source_room: Number(source), display_name: name || selected?.name, apply, token: apply ? plan?.token : undefined,
        }, config);
        setPlan(apply ? null : data);
        if (apply) { setSource(""); await load(); await onChanged?.(); setSuccess(t("roomIdentity.applied")); }
    });
    return <Paper sx={{ p: 2, display: "grid", gap: 2 }}>
        <Typography variant="h6">{t("roomIdentity.title")}</Typography>
        <Typography variant="body2">{t("roomIdentity.help")}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {(preview?.lookup_preview?.rooms?.unrecognized || []).map((row) => {
            const key = `${row.studio}::${row.room}`;
            return <Stack key={key} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                <Typography>{row.studio} / {row.room}</Typography>
                <TextField select size="small" label={t("roomIdentity.interpretAs")} value={choices[key] || ""} sx={{ minWidth: 240 }} onChange={(e) => setChoices({ ...choices, [key]: e.target.value })}>
                    <MenuItem value="">{t("roomIdentity.newRoom")}</MenuItem>
                    {(row.existing_room_options || []).map((room) => <MenuItem key={room.id} value={room.id}>{room.name} · {t("roomIdentity.existing")}</MenuItem>)}
                </TextField>
                <Button disabled={busy || !choices[key]} onClick={() => saveAlias(choices[key], row.room, row.room)}>{t("roomIdentity.useExisting")}</Button>
            </Stack>;
        })}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField select label={t("roomIdentity.keepRoom")} value={target} sx={{ minWidth: 240 }} onChange={(e) => { setTarget(e.target.value); setSource(""); setName(""); setPlan(null); }}>
                {rooms.map((room) => <MenuItem key={room.id} value={room.id}>{room.studio_name} / {room.name}</MenuItem>)}
            </TextField>
            <TextField label={t("roomIdentity.alias")} value={aliasName} onChange={(e) => setAliasName(e.target.value)} />
            <Button disabled={busy || !target || !aliasName.trim()} onClick={() => saveAlias(target, aliasName)}>{t("roomIdentity.saveAlias")}</Button>
        </Stack>
        {selected?.aliases?.length > 0 && <Typography variant="body2">{t("roomIdentity.aliases")}: {selected.aliases.join(", ")}</Typography>}
        <Typography variant="subtitle1">{t("roomIdentity.repairTitle")}</Typography>
        <Typography variant="body2">{t("roomIdentity.repairHelp")}</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField select label={t("roomIdentity.duplicateRoom")} value={source} sx={{ minWidth: 240 }} onChange={(e) => { setSource(e.target.value); setPlan(null); }}>
                {rooms.filter((room) => room.studio === selected?.studio && room.id !== Number(target)).map((room) => <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>)}
            </TextField>
            <TextField label={t("roomIdentity.displayName")} value={name} placeholder={selected?.name || ""} onChange={(e) => { setName(e.target.value); setPlan(null); }} />
            <Button disabled={busy || !target || !source} variant="outlined" onClick={() => consolidate(false)}>{t("roomIdentity.preview")}</Button>
        </Stack>
        {plan && <>
            <Alert severity={plan.plan.blockers.length ? "warning" : "info"}>
                {t("roomIdentity.moveClasses")}: {plan.plan.move_classes.length} · {t("roomIdentity.duplicates")}: {plan.plan.duplicate_classes.length} · {t("roomIdentity.templates")}: {plan.plan.templates} · {t("roomIdentity.closures")}: {plan.plan.closures}
            </Alert>
            {plan.plan.blockers.map((blocker, index) => <Alert key={index} severity="warning">{blocker}</Alert>)}
            <Button variant="contained" disabled={busy || plan.plan.blockers.length > 0} onClick={() => consolidate(true)}>{t("roomIdentity.apply")}</Button>
        </>}
    </Paper>;
}

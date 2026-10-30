import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Head from "next/head";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField } from "@mui/material";
import MainPage from "@/pages/mainPage";
import useI18n from "@/hooks/useI18n";
import { storeAccess } from "@/hooks/useAccess";
import { capabilityNames } from "@/constants/accessCapabilities";

export default function GroupPermissions() {
    const { t } = useI18n();
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [groups, setGroups] = useState([]);
    const [selected, setSelected] = useState("");
    const [profile, setProfile] = useState(null);
    const [values, setValues] = useState({});
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [stale, setStale] = useState(false);
    const [creating, setCreating] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [createError, setCreateError] = useState("");
    const headers = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });

    const loadGroups = useCallback(async () => {
        try {
            const response = await axios.get(`${base}/api/data/groups/`, headers());
            setGroups(response.data);
            return response.data;
        } catch { setFeedback({ severity: "error", text: t("access.error") }); }
    }, [base, t]);
    useEffect(() => { loadGroups(); }, [loadGroups]);

    const selectGroup = async (groupId, available = groups) => {
        setSelected(groupId); setFeedback(null); setStale(false); setProfile(null); setValues({});
        if (!groupId) return;
        setBusy(true);
        try {
            const group = available.find((item) => item.id === Number(groupId));
            let data = group.capabilities;
            if (group.access_profile_id) {
                const response = await axios.get(`${base}/api/data/group-access-profiles/${group.access_profile_id}/`, headers());
                setProfile(response.data); data = response.data;
            }
            setValues(Object.fromEntries(capabilityNames.map((name, index) => [name,
                group.name === "Admin" && index < 6 ? true : Boolean(data[name])])));
        } catch { setFeedback({ severity: "error", text: t("access.error") }); setStale(true); }
        finally { setBusy(false); }
    };

    const save = async () => {
        setBusy(true); setFeedback(null);
        try {
            const payload = { ...values, group: Number(selected), ...(profile ? { expected_revision: profile.revision } : {}) };
            const url = `${base}/api/data/group-access-profiles/${profile ? `${profile.id}/` : ""}`;
            const response = await axios[profile ? "patch" : "post"](url, payload, headers());
            setProfile(response.data);
            await loadGroups();
            // Reflect changes to the current user's own groups immediately.
            try {
                const access = await axios.get(`${base}/api/data/me/permissions/`, headers());
                storeAccess(access.data);
            } catch { /* Backend still enforces each request; next navigation refreshes access. */ }
            setFeedback({ severity: "success", text: t("access.saved") });
        } catch (error) {
            const conflict = error.response?.status === 409;
            setStale(conflict);
            setFeedback({ severity: "error", text: t(conflict ? "access.conflict" : "access.saveError") });
        } finally { setBusy(false); }
    };
    const createGroup = async (event) => {
        event.preventDefault();
        if (busy || !groupName.trim()) return;
        setBusy(true); setCreateError("");
        try {
            const response = await axios.post(`${base}/api/data/groups/`, { name: groupName.trim() }, headers());
            const available = [...groups, response.data].sort((a, b) => a.name.localeCompare(b.name));
            setGroups(available); setCreating(false); setGroupName("");
            await selectGroup(response.data.id, available);
            setFeedback({ severity: "success", text: t("access.groupCreated") });
        } catch (error) {
            const detail = error.response?.data?.name;
            setCreateError(Array.isArray(detail) ? detail.join(" ") : t("access.createError"));
        } finally { setBusy(false); }
    };
    const group = groups.find((item) => item.id === Number(selected));
    return <MainPage><Head><title>{t("access.groups")} | Beness Analytics</title></Head>
        <Stack spacing={2} sx={{ p: 3, maxWidth: 900 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <h1>{t("access.groups")}</h1>
                <Button variant="outlined" disabled={busy} onClick={() => { setCreateError(""); setCreating(true); }}>{t("access.createGroup")}</Button>
            </Stack>
            <Alert severity="info">{t("access.groupHelp")}</Alert>
            {feedback && <Alert severity={feedback.severity}>{feedback.text}</Alert>}
            <TextField select label={t("access.group")} value={selected} disabled={busy}
                onChange={(event) => selectGroup(event.target.value)}>
                <MenuItem value="">{t("access.choose")}</MenuItem>
                {groups.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
            </TextField>
            {busy && <CircularProgress size={24} />}
            {selected && !busy && <Paper sx={{ p: 2 }}>
                {group?.name === "Admin" && <Alert severity="info">{t("access.adminHelp")}</Alert>}
                <Stack>{capabilityNames.map((name, index) => <FormControlLabel key={name}
                    label={t(`access.${name}`)} control={<Switch checked={Boolean(values[name])}
                        disabled={stale || (group?.name === "Admin" && index < 6)}
                        onChange={(_, checked) => setValues((old) => ({ ...old, [name]: checked }))} />} />)}
                </Stack>
            </Paper>}
            <Stack direction="row" spacing={2}>
                <Button variant="contained" disabled={!selected || busy || stale} onClick={save}>{t("access.save")}</Button>
                <Button disabled={busy || !selected} onClick={async () => { const fresh = await loadGroups(); if (fresh) await selectGroup(selected, fresh); }}>{t("access.reload")}</Button>
            </Stack>
        </Stack>
        <Dialog open={creating} onClose={() => { if (!busy) setCreating(false); }} fullWidth maxWidth="sm">
            <form onSubmit={createGroup}>
                <DialogTitle>{t("access.createGroup")}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth required label={t("access.groupName")} value={groupName}
                        inputProps={{ maxLength: 150 }} disabled={busy} margin="normal"
                        onChange={(event) => setGroupName(event.target.value)} />
                    <Alert severity="info">{t("access.newGroupHelp")}</Alert>
                    {createError && <Alert severity="error" sx={{ mt: 2 }}>{createError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setCreating(false)}>{t("access.cancel")}</Button>
                    <Button type="submit" variant="contained" disabled={busy || !groupName.trim()}>{t("access.createGroup")}</Button>
                </DialogActions>
            </form>
        </Dialog>
    </MainPage>;
}

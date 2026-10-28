import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";
import { api, auth } from "./workspace/common";
import { formatMoney } from "@/utils/formatMoney";

export default function ClosureCheckDialog({ selected, company, canCheck, close, done }) {
    const { t } = useI18n(); const w = (key) => t(`finance.workspace.${key}`);
    const day = selected.day; const status = day.check?.status || "open";
    const [note, setNote] = useState(day.check?.note || ""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [history, setHistory] = useState([]);
    useEffect(() => { let live = true; const params = new URLSearchParams({ company, month: day.date.slice(0, 7), day: day.date, channel: selected.channel });
        axios.get(api(`closures/history/?${params}`), auth()).then(({ data }) => { if (live) setHistory(data.results); }).catch(() => { if (live) setError(t("finance.workspace.error")); });
        return () => { live = false; };
    }, [company, day.date, selected.channel, t]);
    const save = async (operation) => { setBusy(true); setError("");
        try { await axios.post(api(`closures/${operation}/`), { company: Number(company), day: day.date, channel: selected.channel, expected_revision: day.check?.revision || 0, expected_token: day.check_token, note }, auth()); await done(); }
        catch { setError(w("checkError")); } finally { setBusy(false); }
    };
    const reasonRequired = day.difference !== null && Number(day.difference) !== 0;
    return <Dialog open onClose={busy ? undefined : close} fullWidth maxWidth="sm"><DialogTitle>{w("closure_check")} · {day.date}</DialogTitle><DialogContent><Stack spacing={2}>
        <Typography>{t(`finance.receipts.channel.${selected.channel}`)} · {w(`check_${status}`)}</Typography>
        <Typography>{w("closure_expected")}: {day.expected === null ? "—" : formatMoney(day.expected)} · {w("closure_actual")}: {formatMoney(day.actual)} · {w("closure_difference")}: {day.difference === null ? "—" : formatMoney(day.difference)}</Typography>
        <Typography variant="body2">{w("checkHelp")}</Typography>
        {status === "needs_recheck" && <Alert severity="warning">{w("checkStale")}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField multiline minRows={2} label={w("reason")} required={reasonRequired} value={note} disabled={busy || !canCheck} inputProps={{ maxLength: 2000 }} onChange={(e) => setNote(e.target.value)} helperText={w(reasonRequired ? "checkReason" : "checkOptionalReason")} />
        {history.length > 0 && <details><summary>{w("checkHistory")}</summary>{history.map((event) => <Typography key={event.id} variant="body2" sx={{ mt: 1 }}>{w(`check_event_${event.action}`)} · {event.actor_name || "—"} · {new Date(event.created_at).toLocaleString()}{event.action === "check" && ` · ${event.note || "—"}`}</Typography>)}</details>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{w("close")}</Button>
        {canCheck && status !== "open" && <Button disabled={busy} onClick={() => save("reopen")}>{w("checkReopen")}</Button>}
        {canCheck && <Button variant="contained" disabled={busy || status === "checked" || day.expected === null || (reasonRequired && !note.trim())} onClick={() => save("check")}>{w("checkConfirm")}</Button>}
    </DialogActions></Dialog>;
}

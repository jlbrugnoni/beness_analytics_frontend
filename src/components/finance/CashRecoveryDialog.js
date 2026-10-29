import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";
import { api, auth } from "./workspace/common";

export default function CashRecoveryDialog({ batch, account, mode, close, done }) {
    const { t } = useI18n(); const w = (key) => t(`finance.workspace.${key}`);
    const [plan, setPlan] = useState(null); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [refresh, setRefresh] = useState(0);
    useEffect(() => { let live = true; setPlan(null);
        axios.get(api(`migration-imports/${batch}/cash-recovery/?account=${account}&mode=${mode}`), auth()).then(({ data }) => { if (live) setPlan(data); }).catch(() => { if (live) setError(t("finance.workspace.error")); });
        return () => { live = false; };
    }, [batch, account, mode, refresh, t]);
    const submit = async () => { setBusy(true); setError("");
        try { await axios.post(api(`migration-imports/${batch}/cash-recovery/`), { account: Number(account), mode, note: reason, expected_plan: plan.token }, auth()); done(); }
        catch { setError(w("recoveryError")); setRefresh((n) => n + 1); } finally { setBusy(false); }
    };
    return <Dialog open onClose={busy ? undefined : close} fullWidth maxWidth="sm"><DialogTitle>{w(mode === "undo" ? "cashUndo" : "cashRestore")}</DialogTitle><DialogContent><Stack spacing={2}>
        <Typography>{w(mode === "undo" ? "cashUndoHelp" : "cashRestoreHelp")}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {!plan ? <CircularProgress /> : <><Typography>{w("recoveryEligible")}: {plan.eligible.length} · {w("recoveryProtected")}: {plan.protected.length}</Typography>
            {plan.protected.map((r) => <Typography variant="body2" key={r.id}>#{r.id} · {w(`recovery_${r.reason}`)}</Typography>)}
            <TextField label={w("reason")} multiline minRows={2} required value={reason} disabled={busy} inputProps={{ maxLength: 2000 }} onChange={(e) => setReason(e.target.value)} />
        </>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{w("close")}</Button><Button variant="contained" disabled={busy || !plan?.can_write || !plan?.eligible.length || !reason.trim()} onClick={submit}>{w(mode === "undo" ? "cashUndo" : "cashRestore")}</Button></DialogActions></Dialog>;
}

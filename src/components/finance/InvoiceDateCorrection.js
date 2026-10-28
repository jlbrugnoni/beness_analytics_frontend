import { useState } from "react";
import axios from "axios";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { api, auth } from "./workspace/common";
import { formatMoney } from "@/utils/formatMoney";

export default function InvoiceDateCorrection({ value, close, changed, t }) {
    const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const label = (key) => t(`finance.salesPosting.${key}`);
    const submit = async () => {
        setBusy(true); setError("");
        try {
            await axios.post(api(`sales-imports/${value.batch}/resolve/`), { expected_plan: value.token, decision_id: value.row.decision_id, expected_revision: value.row.decision_revision, action: "correct_date", note }, auth());
            changed(); close();
        } catch (failure) { setError(label(failure.response?.status === 409 ? "stale" : "error")); }
        finally { setBusy(false); }
    };
    return <Dialog open={Boolean(value)} onClose={() => { if (!busy) close(); }} fullWidth maxWidth="sm"><DialogTitle>{label("correctDate")}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>{value.row.code} · {value.row.source.customer} · {formatMoney(value.row.source.invoice_total)}</Typography>
        <Typography>{label("before")}: {value.row.sale.source.date} → {label("after")}: {value.row.source.date}</Typography>
        <Typography>{label("correctDateHelp")}</Typography>
        <TextField required label={label("note")} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} multiline minRows={2} inputProps={{ maxLength: 2000 }} />
        {error && <Alert severity="error">{error}</Alert>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{label("close")}</Button><Button disabled={busy || !note.trim()} variant="contained" onClick={submit}>{label("correctDate")}</Button></DialogActions></Dialog>;
}

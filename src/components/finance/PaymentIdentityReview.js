import { useState } from "react";
import axios from "axios";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { api, auth } from "./workspace/common";
import { formatMoney } from "@/utils/formatMoney";

export default function PaymentIdentityReview({ value, close, changed, t }) {
    const row = value.row; const candidates = row.identity_candidates || [];
    const l = (key) => t(`finance.receipts.${key}`);
    const [choice, setChoice] = useState(!candidates.length ? "create" : "");
    const [distinct, setDistinct] = useState(false); const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const submit = async () => {
        setBusy(true); setError("");
        try {
            await axios.post(api(`payment-imports/${value.batch}/resolve-identity/`), { row_id: row.row_id, expected_plan: value.token, action: choice === "create" ? "create" : "link", ...(choice !== "create" ? { receipt_id: Number(choice) } : {}), distinct, note }, auth());
            changed(); close();
        } catch (failure) { setError(failure.response?.status === 409 ? l("stale") : Object.values(failure.response?.data || {}).flat().join(" · ") || l("error")); }
        finally { setBusy(false); }
    };
    return <Dialog open onClose={() => { if (!busy) close(); }} fullWidth maxWidth="sm"><DialogTitle>{l("identityReview")}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>{l("row")}: {row.source_row} · {l("invoice")}: {row.invoice_code}</Typography>
        <Typography>{row.date} · {row.customer} · {formatMoney(row.amount)} · {row.method || row.original_method}</Typography>
        <Typography>{l("number")}: {row.number || l("notSupplied")}</Typography>
        <Typography>{l("identityHelp")}</Typography>
        <TextField select label={l("identityDecision")} value={choice} disabled={busy} onChange={(e) => { setChoice(e.target.value); setDistinct(false); }} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
            <MenuItem value="">{l("chooseIdentity")}</MenuItem>
            {candidates.map((r) => <MenuItem key={r.id} value={String(r.id)} disabled={r.reconciled || !r.matches}>{l("linkExisting")} · {r.number} · {r.source.date} · {r.source.customer} · {formatMoney(r.source.amount)}</MenuItem>)}
            <MenuItem value="create">{l(candidates.length ? "createDistinct" : "acceptMissingNumber")}</MenuItem>
        </TextField>
        {choice === "create" && candidates.length > 0 && <FormControlLabel control={<Checkbox checked={distinct} disabled={busy} onChange={(e) => setDistinct(e.target.checked)} />} label={l("distinctConfirmation")} />}
        <TextField label={l("identityComment")} value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 2000 }} />
        {error && <Alert severity="error">{error}</Alert>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{l("cancel")}</Button><Button variant="contained" disabled={busy || !choice || (choice === "create" && candidates.length > 0 && !distinct)} onClick={submit}>{l("confirmIdentity")}</Button></DialogActions></Dialog>;
}

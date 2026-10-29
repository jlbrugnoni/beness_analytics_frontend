import { useState } from "react";
import axios from "axios";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from "@mui/material";
import { api, auth } from "./common";
import { formatMoney } from "@/utils/formatMoney";

export default function PaymentMatchingReview({ payment, canReview, changed, w, t }) {
    const review = payment.matching_review;
    const [decision, setDecision] = useState(null); const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const label = (key) => t(`finance.receipts.${key}`);
    if (!review) return null;
    const submit = async () => {
        setBusy(true); setError("");
        try {
            await axios.post(api(`receipts/${payment.id}/review-link/`), { expected_token: review.basis_token, decision, note }, auth());
            setDecision(null); setNote(""); changed();
        } catch (failure) { setError(failure.response?.status === 409 ? w("stale") : Object.values(failure.response?.data || {}).flat().join(" · ") || w("error")); }
        finally { setBusy(false); }
    };
    return <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
        <Typography variant="subtitle1">{label("matchingTitle")} · {review.invoice_code}</Typography>
        <Typography>{w("customer")}: {review.invoice_customer || "—"} · {w("status")}: {review.invoice_status} · {review.currency}</Typography>
        <Stack direction="row" gap={3} useFlexGap flexWrap="wrap">
            <Typography>{w("invoice_total")}: {formatMoney(review.invoice_total)}</Typography>
            <Typography>{label("matchingTotal")}: {formatMoney(review.payment_total)}</Typography>
            <Typography color={review.amounts_equal ? "text.primary" : "warning.dark"}>{label("matchingDifference")}: {formatMoney(review.difference)}</Typography>
        </Stack>
        {review.payments.map((row) => <Typography variant="body2" key={row.id}>{row.number} · {row.date} · {row.customer || "—"} · {formatMoney(row.amount)}</Typography>)}
        {review.approved ? <Alert severity="info">{label(review.approval.decision === "accept_names" ? "matchingNamesAccepted" : "matchingAmountAccepted")}{review.approval.note && ` · ${review.approval.note}`}</Alert> : <Typography variant="body2">{label(review.amounts_equal ? "matchingNamesHelp" : "matchingAmountHelp")}</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        {canReview && review.can_accept && <Stack direction="row" gap={1}>
            {review.approved ? <Button disabled={busy} onClick={() => { setError(""); setDecision("reopen"); }}>{label("matchingReopen")}</Button> : (!review.amounts_equal || review.names_differ) && <Button variant="outlined" disabled={busy} onClick={() => { setError(""); setDecision(review.amounts_equal ? "accept_names" : "accept_difference"); }}>{label(review.amounts_equal ? "matchingAcceptNames" : "matchingAcceptAmount")}</Button>}
        </Stack>}
    </Stack>
        <Dialog open={Boolean(decision)} onClose={() => { if (!busy) setDecision(null); }} fullWidth maxWidth="sm"><DialogTitle>{label(decision === "reopen" ? "matchingReopen" : decision === "accept_names" ? "matchingAcceptNames" : "matchingAcceptAmount")}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>{review.invoice_code} · {label("matchingDifference")}: {formatMoney(review.difference)}</Typography>
            <Typography>{label(decision === "reopen" ? "matchingReopenHelp" : "matchingConfirmHelp")}</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label={decision === "accept_difference" ? w("reason") : w("bankComment")} required={decision === "accept_difference"} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} multiline minRows={2} inputProps={{ maxLength: 2000 }} />
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setDecision(null)}>{w("close")}</Button><Button variant="contained" disabled={busy || (decision === "accept_difference" && !note.trim())} onClick={submit}>{label("matchingConfirm")}</Button></DialogActions></Dialog>
    </Paper>;
}

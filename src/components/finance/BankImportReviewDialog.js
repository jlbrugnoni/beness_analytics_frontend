import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { api, auth, Pages } from "./workspace/common";
import { formatMoney } from "@/utils/formatMoney";

export default function BankImportReviewDialog({ batch, close, changed, w }) {
    const [data, setData] = useState(null); const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0);
    const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const [row, setRow] = useState(null); const [action, setAction] = useState(""); const [targetId, setTargetId] = useState(""); const [note, setNote] = useState("");
    const [confirmReady, setConfirmReady] = useState(false);
    useEffect(() => { let live = true; setData(null);
        axios.get(api(`bank-imports/${batch.id}/processing/?pending=1&page=${page}`), auth()).then(({ data: result }) => { if (live) setData(result); })
            .catch(() => { if (live) setError(w("error")); });
        return () => { live = false; };
        // w is a render-local translation helper; refresh only for inputs or actions.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batch.id, page, refresh]);
    const target = row?.candidates.find((item) => item.id === Number(targetId));
    const open = (item) => { setRow(item); setAction(""); setTargetId(""); setNote(""); setError(""); };
    const submit = async (bulk = false) => { setBusy(true); setError("");
        try {
            const payload = bulk ? { expected_plan: data.token } : { expected_plan: data.token, decision_id: row.decision_id, expected_revision: row.revision, action, note,
                ...(["link", "correct"].includes(action) ? { movement_id: target.id, expected_movement_revision: target.revision } : {}) };
            await axios.post(api(`bank-imports/${batch.id}/${bulk ? "apply-pending" : "resolve"}/`), payload, auth());
            setRow(null); setConfirmReady(false); setPage(1); setRefresh((value) => value + 1); changed();
        } catch (failure) { setRow(null); setConfirmReady(false); setRefresh((value) => value + 1); setError(w(failure.response?.status === 409 ? "stale" : "reviewError")); }
        finally { setBusy(false); }
    };
    const ready = (data?.ready_counts?.new || 0) + (data?.ready_counts?.unchanged || 0);
    const value = (source, field) => source ? ["amount", "balance"].includes(field) ? formatMoney(source[field]) : source[field] || "—" : "—";
    return <>
        <Dialog open onClose={busy ? undefined : close} fullWidth maxWidth="lg"><DialogTitle>{w("reviewPending")} · {batch.file_name}</DialogTitle><DialogContent><Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2">{w("reviewHelp")}</Typography>
            {data && <>
                <Typography>{w("pending")}: {data.pending_count} · {w("new")}: {data.ready_counts.new} · {w("unchanged")}: {data.ready_counts.unchanged}</Typography>
                {data.can_review && ready > 0 && <Button variant="contained" sx={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => setConfirmReady(true)}>{w("applyReady")}</Button>}
                {!data.pending_count && <Alert severity="success">{w("reviewComplete")}</Alert>}
                <TableContainer><Table size="small"><TableHead><TableRow>{["date", "description", "amount", "balance", "outcome", "open"].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>
                    {data.rows.results.map((item) => <TableRow key={item.row_id}><TableCell sx={{ whiteSpace: "nowrap" }}>{item.source.bank_date}</TableCell><TableCell>{item.source.description}</TableCell><TableCell>{formatMoney(item.source.amount)}</TableCell><TableCell>{formatMoney(item.source.balance)}</TableCell><TableCell>{w(item.outcome)}</TableCell><TableCell><Button disabled={busy || !data.can_review} onClick={() => open(item)}>{w("reviewRow")}</Button></TableCell></TableRow>)}
                </TableBody></Table></TableContainer><Pages data={data.rows} page={page} setPage={setPage} busy={busy} w={w} />
            </>}
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{w("close")}</Button></DialogActions></Dialog>
        <Dialog open={confirmReady} onClose={busy ? undefined : () => setConfirmReady(false)} fullWidth maxWidth="sm"><DialogTitle>{w("applyReady")}</DialogTitle><DialogContent><Stack spacing={2}>
            <Typography>{w("applyReadyHelp")}</Typography><Typography>{w("new")}: {data?.ready_counts.new || 0} · {w("unchanged")}: {data?.ready_counts.unchanged || 0}</Typography>
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setConfirmReady(false)}>{w("close")}</Button><Button variant="contained" disabled={busy || !data?.can_review || !ready} onClick={() => submit(true)}>{w("confirm")}</Button></DialogActions></Dialog>
        <Dialog open={Boolean(row)} onClose={busy ? undefined : () => setRow(null)} fullWidth maxWidth="md"><DialogTitle>{w("reviewRow")}</DialogTitle><DialogContent><Stack spacing={2}>
            <TextField select label={w("reviewDecision")} value={action} disabled={busy} onChange={(event) => setAction(event.target.value)}><MenuItem value="">{w("reviewChoose")}</MenuItem>{(row?.outcome === "assignment_conflict" ? ["link"] : ["link", "create", "correct"]).map((key) => <MenuItem key={key} value={key}>{w(`reviewAction_${key}`)}</MenuItem>)}</TextField>
            {row?.candidates.length > 0 && <TextField select label={w("existingTransaction")} value={targetId} disabled={busy} onChange={(event) => setTargetId(String(event.target.value))}><MenuItem value="">{w("reviewChoose")}</MenuItem>{row.candidates.map((item) => <MenuItem key={item.id} value={String(item.id)}>#{item.id} · {item.source.bank_date} · {formatMoney(item.source.amount)} · {item.source.description}</MenuItem>)}</TextField>}
            <TableContainer><Table size="small"><TableHead><TableRow><TableCell>{w("field")}</TableCell><TableCell>{w("incomingTransaction")}</TableCell><TableCell>{w("existingTransaction")}</TableCell></TableRow></TableHead><TableBody>{["bank_date", "amount", "description", "balance", "reference", "serial"].map((field) => <TableRow key={field} sx={target && row.source[field] !== target.source[field] ? { bgcolor: "action.hover" } : {}}><TableCell>{w(field)}</TableCell><TableCell>{value(row?.source, field)}</TableCell><TableCell>{value(target?.source, field)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
            {action === "link" && <Typography variant="body2">{w("reviewLinkHelp")}</Typography>}
            {action === "correct" && <><Alert severity="warning">{w("reviewCorrectHelp")}</Alert><TextField required multiline label={w("reason")} value={note} disabled={busy} inputProps={{ maxLength: 2000 }} onChange={(event) => setNote(event.target.value)} /></>}
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setRow(null)}>{w("close")}</Button><Button variant="contained" disabled={busy || !action || (["link", "correct"].includes(action) && !target) || (action === "correct" && !note.trim())} onClick={() => submit()}>{w("confirm")}</Button></DialogActions></Dialog>
    </>;
}

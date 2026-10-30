import { normalizeApiNextUrl } from "@/utils/apiPagination";
import { formatMoney } from "@/utils/formatMoney";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useI18n from "@/hooks/useI18n";

const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });

export default function BankPostingPanel({ batch, onProcessingUpdated }) {
    const { t } = useI18n();
    const label = (key) => t(`finance.posting.${key}`);
    const [data, setData] = useState(null);
    const [page, setPage] = useState(1);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [undo, setUndo] = useState(null);
    const [review, setReview] = useState(null);
    const [note, setNote] = useState("");
    const [lookup, setLookup] = useState("");
    const [target, setTarget] = useState(null);
    const [action, setAction] = useState("create");
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [ledger, setLedger] = useState(null);
    const [ledgerPage, setLedgerPage] = useState(1);
    const [ledgerState, setLedgerState] = useState("active");
    const [history, setHistory] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const version = useRef(0);
    const errorText = (failure) => failure.response?.status === 409 ? label("stale") :
        failure.response?.status === 403 ? label("denied") : typeof failure.response?.data === "object" ? Object.values(failure.response.data).flat().join("\n") : label("error");
    const load = useCallback(async () => {
        const current = ++version.current; setLoading(true); setData(null);
        try {
            const response = await axios.get(api(`bank-imports/${batch.id}/processing/?page=${page}`), auth());
            if (current === version.current) setData(response.data);
        } catch (failure) { if (current === version.current) setError(failure.response?.status === 403 ? t("finance.posting.denied") : t("finance.posting.error")); }
        finally { if (current === version.current) setLoading(false); }
    }, [batch.id, page, t]);
    useEffect(() => { load(); return () => { version.current += 1; }; }, [load]);
    useEffect(() => {
        let current = true;
        if (!ledgerOpen) return undefined;
        setLedger(null);
        axios.get(api(`bank-movements/?account=${batch.account}&page=${ledgerPage}&state=${ledgerState}`), auth())
            .then((response) => { if (current) setLedger(response.data); })
            .catch(() => { if (current) setError(t("finance.posting.error")); });
        return () => { current = false; };
    }, [batch.account, ledgerOpen, ledgerPage, ledgerState, refresh, t]);
    const open = (kind, row = null) => {
        setDialog(kind); setError(null); setNote(""); setReview(row); setUndo(null); setTarget(null); setLookup("");
        setAction(row?.candidates.length ? "link" : "create");
        if (row?.candidates.length) setTarget(row.candidates[0]);
    };
    const openUndo = async () => {
        setBusy(true); setError(null);
        try {
            const response = await axios.get(api(`bank-imports/${batch.id}/undo-preview/`), auth());
            open("undo"); setUndo(response.data);
        } catch (failure) { setError(errorText(failure)); }
        finally { setBusy(false); }
    };
    const submit = async (event) => {
        event.preventDefault(); setBusy(true); setError(null);
        try {
            const route = dialog === "review" ? "resolve" : dialog;
            const payload = dialog === "commit" ? { expected_plan: data.token } : dialog === "undo" ? { expected_plan: undo.token, note } : {
                expected_plan: data.token, decision_id: review.decision_id, expected_revision: review.revision, action, note,
                ...(["link", "correct"].includes(action) ? { movement_id: target?.id, expected_movement_revision: target?.revision } : {}),
            };
            const response = await axios.post(api(`bank-imports/${batch.id}/${route}/`), payload, auth());
            onProcessingUpdated(batch.id, response.data.status || data.posting?.status || "active");
            setDialog(null); setRefresh((old) => old + 1); await load();
        } catch (failure) { setError(errorText(failure)); }
        finally { setBusy(false); }
    };
    const sourceLine = (source) => `${source?.bank_date || "—"} · ${formatMoney(source?.amount)} ${batch.currency} · ${source?.description || "—"}`;
    const paging = (collection, current, change) => <Stack direction="row" alignItems="center" spacing={1}>
        <Button disabled={busy || !collection?.previous} onClick={() => change(current - 1)}>{t("finance.import.previous")}</Button>
        <Typography>{t("finance.import.page")} {current} · {collection?.count || 0}</Typography>
        <Button disabled={busy || !collection?.next} onClick={() => change(current + 1)}>{t("finance.import.next")}</Button>
    </Stack>;
    return <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
        <Typography variant="h5" component="h2">{label("title")}</Typography>
        {batch.migration_batch ? <Typography variant="body2">{label("historicalIntro")}</Typography> : <Alert severity="info">{label("intro")}</Alert>}
        {error && !dialog && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{error}</Alert>}
        <Button disabled={busy || loading} onClick={() => { setError(null); load(); }}>{t("access.reload")}</Button>
        {loading ? <CircularProgress /> : data && <>
            <Typography>{label("status")}: {label(data.posting ? `status.${data.posting.status}` : "status.not_imported")}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={2}>{Object.entries(data.counts).map(([key, count]) => <Typography key={key}>{label(`outcome.${key}`)}: <strong>{count}</strong></Typography>)}</Stack>
            {data.can_commit && <Button variant="contained" disabled={busy} onClick={() => open("commit")}>{label("commit")}</Button>}
            {data.can_undo && <Button color="warning" variant="outlined" disabled={busy} onClick={openUndo}>{label("undoPreview")}</Button>}
            {data.posting?.status === "partial_undo" && <Alert severity="warning">{label("partialHelp")}</Alert>}
            <TableContainer><Table size="small"><TableHead><TableRow>
                {["line", "date", "amount", "description"].map((key) => <TableCell key={key}>{t(`finance.import.${key}`)}</TableCell>)}
                <TableCell>{label("decision")}</TableCell><TableCell>{label("movement")}</TableCell><TableCell>{label("review")}</TableCell>
            </TableRow></TableHead><TableBody>{data.rows.results.map((row) => <TableRow key={row.row_id}>
                <TableCell>{row.migration_sheet ? `${row.migration_sheet}!${row.source_line}` : row.source_line}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.source.bank_date || "—"}</TableCell>
                <TableCell>{formatMoney(row.source.amount)}</TableCell><TableCell sx={{ minWidth: 150, overflowWrap: "anywhere" }}>{row.source.description || "—"}</TableCell>
                <TableCell>{label(`outcome.${row.outcome}`)}</TableCell><TableCell>{row.movement_id || row.target || "—"}</TableCell>
                <TableCell>{data.can_review && row.resolution === "pending" && <Button disabled={busy} onClick={() => open("review", row)}>{label("review")}</Button>}</TableCell>
            </TableRow>)}</TableBody></Table></TableContainer>
            {paging(data.rows, page, setPage)}
        </>}
        <Accordion expanded={ledgerOpen} onChange={(_, expanded) => setLedgerOpen(expanded)}><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>{label("ledger")}</Typography></AccordionSummary>
            <AccordionDetails><Stack spacing={2}>
                <TextField select label={label("ledgerState")} value={ledgerState} onChange={(event) => { setLedgerState(event.target.value); setLedgerPage(1); }}>
                    {["active", "all", "reversed"].map((key) => <MenuItem value={key} key={key}>{label(`ledgerState.${key}`)}</MenuItem>)}
                </TextField>
                {!ledger ? <CircularProgress /> : <>
                    <Typography>{label("ledgerCount")}: {ledger.count}</Typography>
                    {ledger.results.map((movement) => <Paper key={movement.id} variant="outlined" sx={{ p: 1 }}><Stack spacing={1}>
                        <Typography>#{movement.id} · {sourceLine(movement.source)} · {label(movement.active ? "ledgerState.active" : "ledgerState.reversed")}</Typography>
                        <Button onClick={async () => {
                            setBusy(true); setError(null);
                            try {
                                let next = api(`bank-movements/${movement.id}/history/`); const events = [];
                                while (next) { const response = await axios.get(next, auth()); events.push(...response.data.results); next = normalizeApiNextUrl(response.data.next, process.env.NEXT_PUBLIC_BACKEND_URL); }
                                setHistory({ movement, events });
                            } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
                        }}>{label("history")}</Button>
                    </Stack></Paper>)}
                    {paging(ledger, ledgerPage, setLedgerPage)}
                </>}
            </Stack></AccordionDetails>
        </Accordion>
    </Stack>
    <Dialog open={Boolean(dialog)} onClose={() => { if (!busy) setDialog(null); }} fullWidth maxWidth="md"><Stack component="form" onSubmit={submit}>
        <DialogTitle>{label(dialog === "review" ? "review" : dialog === "undo" ? "undoPreview" : "commit")}</DialogTitle>
        <DialogContent><Stack spacing={2}>
            <Typography sx={{ overflowWrap: "anywhere" }}>{batch.company_name} · {batch.account_name} · {batch.file_name}</Typography>
            {error && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{error}</Alert>}
            {dialog === "commit" && <><Alert severity="info">{label("commitHelp")}</Alert>
                {Object.entries(data?.counts || {}).map(([key, count]) => <Typography key={key}>{label(`outcome.${key}`)}: {count}</Typography>)}
            </>}
            {dialog === "review" && <>
                <Typography>{label("reported")}: {sourceLine(review?.source)}</Typography>
                {review?.outcome === "assignment_conflict" && <Typography>{label("assignmentConflictHelp")}</Typography>}
                {review?.migration_source && <Typography variant="body2">{[review.migration_source.manual_description, review.migration_source.category, review.migration_source.subcategory, review.migration_source.location, review.migration_source.payment_method, review.migration_source.expense_period, review.migration_source.operation_date].filter(Boolean).join(" · ")}</Typography>}
                <TextField select label={label("action")} value={action} disabled={busy} onChange={(event) => setAction(event.target.value)}>
                    {(review?.outcome === "assignment_conflict" ? ["link", "ignore"] : ["create", "link", "correct", "ignore"]).map((key) => <MenuItem key={key} value={key}>{label(`action.${key}`)}</MenuItem>)}
                </TextField>
                {["link", "correct"].includes(action) && <>
                    <TextField select label={label("target")} value={target?.id || ""} disabled={busy} onChange={(event) => setTarget(review.candidates.find((candidate) => candidate.id === Number(event.target.value)) || target)}>
                        <MenuItem value="">{label("chooseTarget")}</MenuItem>
                        {review?.candidates.map((candidate) => <MenuItem key={candidate.id} value={candidate.id}>#{candidate.id} · {sourceLine(candidate.source)}</MenuItem>)}
                        {target && !review?.candidates.some((candidate) => candidate.id === target.id) && <MenuItem value={target.id}>#{target.id} · {sourceLine(target.source)}</MenuItem>}
                    </TextField>
                    <Typography variant="body2">{label("lookupHelp")}</Typography>
                    <TextField label={label("lookup")} type="number" inputProps={{ min: 1 }} value={lookup} onChange={(event) => setLookup(event.target.value)} />
                    <Button disabled={busy || !/^[1-9]\d*$/.test(lookup)} onClick={async () => {
                        setBusy(true); setError(null);
                        try {
                            const response = await axios.get(api(`bank-movements/${lookup}/`), auth());
                            if (response.data.account !== batch.account || response.data.provider !== batch.provider || !response.data.active) { setError(label("wrongTarget")); return; }
                            setTarget(response.data);
                        } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
                    }}>{label("loadTarget")}</Button>
                    {target && <Typography>{label("existing")}: #{target.id} · {sourceLine(target.source)}</Typography>}
                    {action === "correct" && <Alert severity="warning">{label("correctHelp")}</Alert>}
                </>}
            </>}
            {dialog === "undo" && undo && <>
                <Alert severity="warning">{label("undoHelp")}</Alert>
                <Typography>{label("eligible")}: {undo.eligible.length}</Typography><Typography>{label("protected")}: {undo.protected.length}</Typography>
                <Typography>{label("reused")}: {undo.reused_unchanged}</Typography>
                {undo.protected.map((item) => <Typography key={`${item.movement_id}-${item.reason}`}>#{item.movement_id}: {label(`protected.${item.reason}`)}</Typography>)}
                {undo.status === "partial_undo" && !undo.eligible.length && <Alert severity="info">{label("noEligible")}</Alert>}
            </>}
            {dialog && dialog !== "commit" && <TextField required label={label("note")} value={note} multiline minRows={2} inputProps={{ maxLength: 2000 }} disabled={busy} onChange={(event) => setNote(event.target.value)} />}
        </Stack></DialogContent>
        <DialogActions><Button disabled={busy} onClick={() => setDialog(null)}>{t("finance.config.cancel")}</Button>
            <Button type="submit" variant="contained" disabled={busy || (dialog === "undo" && (!undo || (undo.status === "partial_undo" && !undo.eligible.length))) || (dialog === "review" && ["link", "correct"].includes(action) && !target)}>{busy ? <CircularProgress size={20} /> : label("confirm")}</Button>
        </DialogActions>
    </Stack></Dialog>
    <Dialog open={Boolean(history)} onClose={() => setHistory(null)} fullWidth maxWidth="md"><DialogTitle>{label("history")} #{history?.movement.id}</DialogTitle><DialogContent><Stack spacing={2}>
        {history?.events.map((item) => <Paper variant="outlined" sx={{ p: 2 }} key={item.id}>
            <Typography>{label(`event.${item.action}`)} · {new Date(item.created_at).toLocaleString()} · {label("importId")} #{item.batch_id}</Typography>
            {item.before.source && <Typography>{label("before")}: {sourceLine(item.before.source)}</Typography>}
            {item.after.source && <Typography>{label("after")}: {sourceLine(item.after.source)}</Typography>}
            {item.note && <Typography sx={{ overflowWrap: "anywhere" }}>{item.note}</Typography>}
        </Paper>)}
    </Stack></DialogContent><DialogActions><Button onClick={() => setHistory(null)}>{t("finance.config.cancel")}</Button></DialogActions></Dialog>
    </Paper>;
}

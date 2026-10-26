import { formatMoney } from "@/utils/formatMoney";
import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";
import useAccess from "@/hooks/useAccess";

const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const empty = { results: [], count: 0 };

export default function SalesPostingPanel({ batch, onUpdated }) {
    const { t } = useI18n(); const label = (key) => t(`finance.salesPosting.${key}`);
    const access = useAccess(); const canEdit = Boolean(access.capabilities?.can_edit_finance);
    const [plan, setPlan] = useState(null); const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0);
    const [sales, setSales] = useState(empty); const [salePage, setSalePage] = useState(1); const [state, setState] = useState("active");
    const [options, setOptions] = useState({ studios: [], channels: [] });
    const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState(null); const [note, setNote] = useState(""); const [undo, setUndo] = useState(null);
    const [edit, setEdit] = useState(null); const [studio, setStudio] = useState(""); const [channel, setChannel] = useState("");
    const [treatment, setTreatment] = useState("pending"); const [replacementCode, setReplacementCode] = useState(""); const [replacement, setReplacement] = useState(null);
    const [historySale, setHistorySale] = useState(null); const [history, setHistory] = useState(empty); const [historyPage, setHistoryPage] = useState(1);
    const base = `sales-imports/${batch.id}/`;
    useEffect(() => {
        let active = true; setLoading(true);
        axios.get(api(`${base}processing/?page=${page}`), auth()).then(({ data }) => { if (active) setPlan(data); })
            .catch(() => { if (active) setError(t("finance.salesPosting.error")); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [base, page, refresh, t]);
    useEffect(() => {
        let active = true; setSales(empty);
        axios.get(api(`sales/?company=${batch.company}&state=${state}&page=${salePage}`), auth()).then(({ data }) => { if (active) setSales(data); })
            .catch(() => { if (active) setError(t("finance.salesPosting.error")); });
        return () => { active = false; };
    }, [batch.company, state, salePage, refresh, t]);
    useEffect(() => {
        let active = true;
        axios.get(api(`sales/options/?company=${batch.company}`), auth()).then(({ data }) => { if (active) setOptions(data); }).catch(() => { if (active) setError(t("finance.salesPosting.error")); });
        return () => { active = false; };
    }, [batch.company, t]);
    useEffect(() => {
        let active = true; setHistory(empty);
        if (!historySale) return undefined;
        axios.get(api(`sales/${historySale.id}/history/?page=${historyPage}`), auth()).then(({ data }) => { if (active) setHistory(data); }).catch(() => { if (active) setError(t("finance.salesPosting.error")); });
        return () => { active = false; };
    }, [historySale, historyPage, t]);
    const mutate = async (path, body) => {
        setBusy(true); setError("");
        try {
            const { data } = await axios.post(api(path), body, auth());
            setRefresh((old) => old + 1); setDialog(null); setEdit(null); setNote("");
            if (data.status && path.startsWith(base)) onUpdated?.(batch.id, data.status);
        } catch (failure) { setError(failure.response?.status === 409 ? label("stale") : `${label("error")} ${failure.response?.status === 400 ? JSON.stringify(failure.response.data) : ""}`); }
        finally { setBusy(false); }
    };
    const openUndo = async () => {
        setBusy(true); setError("");
        try { const { data } = await axios.get(api(`${base}undo-preview/`), auth()); setUndo(data); setNote(""); setDialog({ type: "undo" }); }
        catch { setError(label("error")); } finally { setBusy(false); }
    };
    const openEdit = (sale) => {
        setEdit(sale); setStudio(sale.studio || ""); setChannel(sale.channel || ""); setTreatment(sale.cancellation_treatment); setReplacement(sale.replacement ? { id: sale.replacement } : null); setReplacementCode(""); setNote("");
    };
    const findReplacement = async () => {
        setBusy(true); setError(""); setReplacement(null);
        try {
            const { data } = await axios.get(api(`sales/?company=${batch.company}&code=${encodeURIComponent(replacementCode.trim())}`), auth());
            const found = data.results.find((sale) => sale.id !== edit.id && sale.source.status_kind === "paid");
            if (found) setReplacement(found); else setError(label("replacementMissing"));
        } catch { setError(label("error")); } finally { setBusy(false); }
    };
    const save = () => mutate(`sales/${edit.id}/assign/`, { expected_revision: edit.revision, studio: studio || null, channel: channel || null, note,
        ...(edit.source.status_kind === "cancelled" ? { cancellation_treatment: treatment, replacement: treatment === "replacement" ? replacement?.id : null } : {}) });
    const controls = (data, value, setter) => <Stack direction="row" spacing={2} alignItems="center"><Button disabled={busy || !data.previous} onClick={() => setter(value - 1)}>{label("previous")}</Button><Typography>{label("page")} {value} · {data.count}</Typography><Button disabled={busy || !data.next} onClick={() => setter(value + 1)}>{label("next")}</Button></Stack>;
    const snapshot = (value) => value ? <Stack spacing={0.5}><Typography>{value.source?.status} · {value.source?.date} · {formatMoney(value.source?.invoice_total)} DOP</Typography><Typography>{label("customer")}: {value.source?.customer}</Typography><Typography>{label("studio")}: {options.studios.find((item) => item.id === value.studio)?.name || "—"} · {label("channel")}: {options.channels.find((item) => item.value === value.channel)?.label || "—"}</Typography>{value.source?.status_kind === "cancelled" && value.cancellation_treatment && <Typography>{label("treatment")}: {label(value.cancellation_treatment)} {value.replacement ? `#${value.replacement}` : ""}</Typography>}</Stack> : null;
    return <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
        <Typography variant="h5">{label("title")}</Typography><Alert severity="info">{label("intro")}</Alert>
        {error && <Alert severity="error" sx={{ overflowWrap: "anywhere" }}>{error}</Alert>}
        <Button disabled={busy || loading} onClick={() => { setError(""); setRefresh((old) => old + 1); }}>{label("refresh")}</Button>
        {loading && !plan ? <CircularProgress /> : plan && <>
            <Typography>{label("status")}: {label(plan.posting?.status || "not_imported")}</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">{Object.entries(plan.counts).map(([key, count]) => <Chip key={key} label={`${label(key)}: ${count}`} />)}</Stack>
            <Stack direction="row" spacing={2}>{plan.can_commit && <Button variant="contained" disabled={busy || loading} onClick={() => setDialog({ type: "commit" })}>{label("commit")}</Button>}{plan.can_undo && <Button disabled={busy || loading} onClick={openUndo}>{label("undo")}</Button>}</Stack>
            <TableContainer><Table size="small"><TableHead><TableRow>{["code", "reported", "current", "outcome", "review"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead><TableBody>{plan.rows.results.map((row) => <TableRow key={row.invoice_id}><TableCell>{row.code}</TableCell><TableCell>{row.source.status}</TableCell><TableCell>{row.sale?.source.status || "—"}</TableCell><TableCell>{label(row.resolution || row.outcome)}</TableCell><TableCell>{plan.can_review && row.resolution === "pending" && <Button disabled={busy || loading} onClick={() => { setDialog({ type: "review", row, token: plan.token }); setNote(""); }}>{label("review")}</Button>}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
            {controls(plan.rows, page, setPage)}
        </>}
        <Typography variant="h5">{label("ledger")}</Typography><Typography variant="body2">{label("ledgerHelp")}</Typography>
        <TextField select label={label("state")} value={state} disabled={busy} onChange={(event) => { setState(event.target.value); setSalePage(1); }}>{["active", "all", "reversed"].map((key) => <MenuItem key={key} value={key}>{label(key)}</MenuItem>)}</TextField>
        {!sales.count ? <Typography>{label("empty")}</Typography> : <TableContainer><Table size="small"><TableHead><TableRow>{["code", "reported", "studio", "channel", "contribution", "warnings", "edit", "history"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead><TableBody>{sales.results.map((sale) => <TableRow key={sale.id}><TableCell>{sale.code}</TableCell><TableCell>{sale.source.status}{!sale.active && ` (${label("reversed")})`}</TableCell><TableCell>{sale.studio_name || label("unassigned")}</TableCell><TableCell>{options.channels.find((item) => item.value === sale.channel)?.label || label("unassigned")}</TableCell><TableCell>{formatMoney(sale.contribution)}</TableCell><TableCell>{label(sale.assignments.requires_review ? "requiresReview" : "ready")}{sale.source.status_kind === "cancelled" && <Typography variant="body2">{label("treatment")}: {label(sale.cancellation_treatment)} {sale.replacement ? `#${sale.replacement}` : ""}</Typography>}</TableCell><TableCell>{canEdit && sale.active && <Button disabled={busy} onClick={() => openEdit(sale)}>{label("edit")}</Button>}</TableCell><TableCell><Button disabled={busy} onClick={() => { setHistorySale(sale); setHistoryPage(1); }}>{label("history")}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>}
        {controls(sales, salePage, setSalePage)}
    </Stack>
        <Dialog open={Boolean(dialog)} onClose={() => { if (!busy) setDialog(null); }} fullWidth maxWidth="md"><DialogTitle>{label(dialog?.type === "commit" ? "confirmCommit" : dialog?.type === "undo" ? "undo" : "reviewTitle")}</DialogTitle><DialogContent><Stack spacing={2}>
            <Typography>{batch.company_name} · {batch.file_name} · #{batch.id}</Typography>
            {dialog?.type === "commit" && <Typography>{label("commitHelp")}</Typography>}
            {dialog?.type === "review" && <><Typography>{dialog.row.code}</Typography><Alert severity="warning">{label("immutable")}</Alert><Typography>{label("current")}</Typography>{snapshot(dialog.row.sale)}<Typography>{label("reported")}</Typography><Typography>{dialog.row.source.status} · {dialog.row.source.date} · {formatMoney(dialog.row.source.invoice_total)} DOP</Typography><Typography>{label("customer")}: {dialog.row.source.customer}</Typography><Typography>{label("before")} · {label("items")}</Typography>{dialog.row.sale?.items.map((item, index) => <Typography key={index}>{item.name} · {item.quantity} · {formatMoney(item.total)} DOP</Typography>)}<Typography>{label("after")} · {label("items")}: {dialog.row.item_count}</Typography>{dialog.row.items.map((item, index) => <Typography key={index}>{item.name} · {item.quantity} · {formatMoney(item.total)} DOP</Typography>)}</>}
            {dialog?.type === "undo" && <><Alert severity="warning">{label("undoHelp")}</Alert><Typography>{label("eligible")}: {undo?.eligible.length} · {label("protected")}: {undo?.protected.length} · {label("reused")}: {undo?.reused}</Typography>{undo?.protected.map((item) => <Typography key={item.sale_id}>#{item.sale_id}: {label(item.reason)}</Typography>)}</>}
            {dialog?.type !== "commit" && <TextField label={label("note")} value={note} multiline minRows={2} disabled={busy} onChange={(event) => setNote(event.target.value)} />}
            {error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setDialog(null)}>{label("close")}</Button>
            {dialog?.type === "commit" && <Button disabled={busy || loading} onClick={() => mutate(`${base}commit/`, { expected_plan: plan.token })}>{label("confirm")}</Button>}
            {dialog?.type === "undo" && <Button disabled={busy || !note.trim() || !undo?.eligible.length && !undo?.reused} onClick={() => mutate(`${base}undo/`, { expected_plan: undo.token, note })}>{label("confirm")}</Button>}
            {dialog?.type === "review" && <><Button disabled={busy || !note.trim()} onClick={() => mutate(`${base}resolve/`, { expected_plan: dialog.token, decision_id: dialog.row.decision_id, expected_revision: dialog.row.decision_revision, action: "retain", note })}>{label("retain")}</Button>{dialog.row.outcome === "cancellation" && <Button disabled={busy || !note.trim()} onClick={() => mutate(`${base}resolve/`, { expected_plan: dialog.token, decision_id: dialog.row.decision_id, expected_revision: dialog.row.decision_revision, action: "cancel", note })}>{label("approveCancel")}</Button>}</>}
        </DialogActions></Dialog>
        <Dialog open={Boolean(edit)} onClose={() => { if (!busy) setEdit(null); }} fullWidth maxWidth="md"><DialogTitle>{label("assignments")} · {edit?.code}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>{t("finance.sales.studio")}: {edit?.source.cost_center || "—"} · {t("finance.sales.price")}: {edit?.source.price_list || "—"} · {t("finance.sales.method")}: {edit?.source.payment_method || "—"}</Typography>
            {edit?.assignments.warnings?.map((warning) => <Alert severity="info" key={warning}>{t(`finance.mapping.warning.${warning}`)}</Alert>)}
            <TextField select label={label("studio")} value={studio} disabled={busy} onChange={(event) => setStudio(event.target.value)}><MenuItem value="">{label("unassigned")}</MenuItem>{options.studios.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
            <TextField select label={label("channel")} value={channel} disabled={busy} onChange={(event) => setChannel(event.target.value)}><MenuItem value="">{label("unassigned")}</MenuItem>{options.channels.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField>
            {edit?.source.status_kind === "cancelled" && <><Alert severity="info">{label("treatmentHelp")}</Alert><TextField select label={label("treatment")} value={treatment} disabled={busy} onChange={(event) => { setTreatment(event.target.value); if (event.target.value !== "replacement") setReplacement(null); }}>{["pending", "refund", "no_refund", "replacement"].map((key) => <MenuItem key={key} value={key}>{label(key)}</MenuItem>)}</TextField>{treatment === "replacement" && <><TextField label={label("replacementCode")} value={replacementCode} disabled={busy} onChange={(event) => { setReplacementCode(event.target.value); setReplacement(null); }} /><Button disabled={busy || !replacementCode.trim()} onClick={findReplacement}>{label("find")}</Button>{replacement && <Typography>{label("replacementFound")}: {replacement.code || `#${replacement.id}`}</Typography>}</>}</>}
            <TextField label={label("note")} value={note} disabled={busy} multiline minRows={2} onChange={(event) => setNote(event.target.value)} />{error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setEdit(null)}>{label("close")}</Button><Button disabled={busy || !note.trim() || treatment === "replacement" && !replacement} onClick={save}>{label("save")}</Button></DialogActions></Dialog>
        <Dialog open={Boolean(historySale)} onClose={() => setHistorySale(null)} fullWidth maxWidth="md"><DialogTitle>{label("historyTitle")} · {historySale?.code}</DialogTitle><DialogContent><Stack spacing={2}>{history.results.map((entry) => <Paper variant="outlined" key={entry.id} sx={{ p: 2 }}><Typography>{entry.created_at} · {label("sourceBatch")} #{entry.batch_id} · {entry.action}</Typography><Typography>{entry.note}</Typography>{entry.before.source && <><Typography>{label("before")}</Typography>{snapshot(entry.before)}</>}{entry.after.source && <><Typography>{label("after")}</Typography>{snapshot(entry.after)}</>}</Paper>)}{controls(history, historyPage, setHistoryPage)}</Stack></DialogContent><DialogActions><Button onClick={() => setHistorySale(null)}>{label("close")}</Button></DialogActions></Dialog>
    </Paper>;
}

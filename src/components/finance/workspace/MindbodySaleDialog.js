import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { api, auth, empty, Pages, SourceDialog, SourceFields } from "./common";
import { formatMoney } from "@/utils/formatMoney";

const channels = ["card_terminal", "cash", "transfer", "recurring", "payment_link", "other"];
export default function MindbodySaleDialog({ record, company, studios, close, changed, canEdit, canReopen, canPayments, w, t }) {
    const [sale, setSale] = useState(null);
    const [edits, setEdits] = useState({});
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [refresh, setRefresh] = useState(0);
    const [source, setSource] = useState(null);
    const [history, setHistory] = useState(false);
    const [events, setEvents] = useState(empty);
    const [page, setPage] = useState(1);
    const m = (key) => t(`finance.mindbody.${key}`);
    const selection = new URLSearchParams({ company, code: record?.code || "" }).toString();
    useEffect(() => { setHistory(false); setSource(null); setSale(null); setError(""); setPage(1); }, [record, company]);
    useEffect(() => {
        let active = true;
        if (!record) return undefined;
        setLoading(true); setEdits({});
        axios.get(api(`mindbody-sales/detail/?${selection}`), auth()).then(({ data }) => { if (active) setSale(data); })
            .catch(() => { if (active) setError(t("finance.workspace.error")); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [record, selection, refresh, t]);
    useEffect(() => {
        let active = true;
        if (!record || !history) return undefined;
        setEvents(empty);
        axios.get(api(`mindbody-sales/history/?${selection}&page=${page}`), auth()).then(({ data }) => { if (active) setEvents(data); })
            .catch(() => { if (active) setError(t("finance.workspace.error")); });
        return () => { active = false; };
    }, [record, history, selection, page, refresh, t]);
    const write = async (operation) => {
        setBusy(true); setError("");
        try {
            const { data } = await axios.post(api(`mindbody-sales/${operation}/?${selection}`), { expected_token: sale.token, ...(operation === "assign" ? edits : {}) }, auth());
            setSale(data); setEdits({}); setRefresh((old) => old + 1); changed();
        } catch (failure) { setError(w(failure.response?.status === 409 ? "stale" : "error")); }
        finally { setBusy(false); }
    };
    const paymentEdit = (key, field, value) => setEdits((old) => ({ ...old, payments: { ...old.payments, [key]: { ...old.payments?.[key], [field]: value } } }));
    const editable = canEdit && canPayments && sale && !sale.locked;
    const method = (value) => t(`finance.receipts.channel.${value || "unknown"}`);
    return <><Dialog open={Boolean(record)} onClose={() => { if (!busy) close(); }} fullWidth maxWidth="lg">
        <DialogTitle>{m("sale")} · {record?.code}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {loading ? <CircularProgress /> : sale && <>
                <Typography variant="body2">{m("sourceHelp")}</Typography>
                {sale.source_changed && <Alert severity="warning">{m("sourceChanged")} <Button onClick={() => setSource({ source: sale.previous_source })}>{m("previousSource")}</Button></Alert>}
                {!!sale.missing_fields.length && <Alert severity="warning">{sale.missing_fields.map((key) => m(key)).join(" · ")}</Alert>}
                {sale.locked && <Typography variant="body2">{w("reviewLock")}</Typography>}
                <Stack direction="row" gap={3} useFlexGap flexWrap="wrap">
                    <Typography>{w("date")}: {sale.source.date || "—"}</Typography><Typography>{w("customer")}: {sale.source.customer}</Typography>
                    <Typography>{w("amount")}: {formatMoney(sale.source.invoice_total)} EUR</Typography><Typography>{w(sale.reviewed ? "reviewed" : "review")}</Typography>
                </Stack>
                {editable ? <TextField select label={w("studio")} value={edits.studio !== undefined ? edits.studio ?? "" : sale.studio ?? ""} disabled={busy} onChange={(event) => setEdits({ ...edits, studio: event.target.value ? Number(event.target.value) : null })}>
                    <MenuItem value="">{w("unknown")}</MenuItem>{studios.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </TextField> : <Typography>{w("studio")}: {sale.studio_name || w("unknown")}</Typography>}
                <Stack direction="row" gap={1}><Button onClick={() => setSource({ source: sale.source, items: sale.items, file_name: sale.file_name, source_rows: sale.source_rows })}>{w("source")}</Button><Button onClick={() => { setHistory(true); setPage(1); }}>{w("audit")}</Button></Stack>
                <Box component="details"><Box component="summary" sx={{ cursor: "pointer" }}>{m("items")} ({sale.items.length})</Box><Table size="small"><TableHead><TableRow>{["item", "quantity", "amount"].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>{sale.items.map((item, index) => <TableRow key={index}><TableCell>{item.name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatMoney(item.total)}</TableCell></TableRow>)}</TableBody></Table></Box>
                <Typography variant="h6">{m("payments")} ({sale.payment_count ?? "—"})</Typography>
                {!canPayments ? <Typography>{w("paymentDetailsAccess")}</Typography> : sale.payments.map((payment) => {
                    const edit = edits.payments?.[payment.key] || {};
                    return <Paper variant="outlined" key={payment.key} sx={{ p: 2 }}><Stack spacing={2}>
                        <Typography>{payment.original_method || w("unknown")} · {formatMoney(payment.amount)} EUR</Typography>
                        {editable ? <Stack direction={{ xs: "column", md: "row" }} gap={2}>
                            <TextField select label={w("channel")} value={edit.channel ?? payment.channel} disabled={busy} sx={{ minWidth: 240 }} onChange={(event) => paymentEdit(payment.key, "channel", event.target.value)}><MenuItem value="">{w("unknown")}</MenuItem>{channels.map((channel) => <MenuItem key={channel} value={channel}>{method(channel)}</MenuItem>)}</TextField>
                            <TextField select label={w("studio")} value={edit.studio !== undefined ? edit.studio ?? "" : sale.assignments.payments?.[payment.key]?.studio ?? ""} disabled={busy} sx={{ minWidth: 240 }} onChange={(event) => paymentEdit(payment.key, "studio", event.target.value ? Number(event.target.value) : null)}><MenuItem value="">{w("inherit")}</MenuItem>{studios.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>
                        </Stack> : <Typography>{method(payment.channel)} · {payment.studio_name || w("unknown")}</Typography>}
                    </Stack></Paper>;
                })}
            </>}
        </Stack></DialogContent>
        <DialogActions>
            {editable && <Button disabled={busy || !Object.keys(edits).length} onClick={() => write("assign")}>{w("save")}</Button>}
            {sale && canPayments && (sale.locked ? canReopen && <Button disabled={busy || loading} onClick={() => write("reopen")}>{w("reopenEntry")}</Button> : canEdit && <Button disabled={busy || loading || !!sale.missing_fields.length || !!Object.keys(edits).length} onClick={() => write("review")}>{w("completeReview")}</Button>)}
            <Button disabled={busy} onClick={close}>{w("close")}</Button>
        </DialogActions>
    </Dialog>
    <SourceDialog data={source} close={() => setSource(null)} w={w} />
    <Dialog open={history && Boolean(record)} onClose={() => setHistory(false)} fullWidth maxWidth="md"><DialogTitle>{w("audit")}</DialogTitle><DialogContent><Stack spacing={2}>{events.results.map((event) => <Paper variant="outlined" key={event.id} sx={{ p: 2 }}><Typography>{event.created_at} · {event.file_name || event.note || event.action} · {m("actor")} #{event.actor ?? event.actor_id ?? "—"}</Typography>{["before", "after"].map((key) => event[key]?.source && <Box key={key}><Typography>{w(key)} · {w("studio")}: {studios.find((s) => s.id === event[key].studio)?.name || "—"}</Typography>{event[key].payments?.map((payment) => <Typography key={payment.key}>{payment.original_method}: {formatMoney(payment.amount)} EUR {payment.channel ? `· ${method(payment.channel)}` : ""} {payment.studio_name ? `· ${payment.studio_name}` : ""}</Typography>)}<SourceFields source={event[key].source} w={w} /></Box>)}</Paper>)}<Pages data={events} page={page} setPage={setPage} busy={busy} w={w} /></Stack></DialogContent><DialogActions><Button onClick={() => setHistory(false)}>{w("close")}</Button></DialogActions></Dialog>
    </>;
}

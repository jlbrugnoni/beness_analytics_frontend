import PaymentMatchingReview from "./PaymentMatchingReview";
import { formatMoney } from "@/utils/formatMoney";
import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, TextField, Typography } from "@mui/material";
import { api, auth, empty, Pages, SourceDialog, SourceFields } from "./common";

export default function InvoiceDialog({ record, kind, close, company, studios, canEdit, canPayments, canReview = false, changed, w, t }) {
    const [invoice, setInvoice] = useState(null); const [payments, setPayments] = useState(empty);
    const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0); const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState({ channels: [], studios: [] }); const [edits, setEdits] = useState({});
    const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [source, setSource] = useState(null);
    const [history, setHistory] = useState(null); const [historyPage, setHistoryPage] = useState(1); const [events, setEvents] = useState(empty);
    useEffect(() => { setPage(1); setInvoice(null); setPayments(empty); setEdits({}); setError(""); setSaved(false); setHistory(null); setSource(null); }, [record]);
    useEffect(() => {
        let active = true;
        if (!record) return undefined;
        setLoading(true); setEdits({});
        const fetches = [axios.get(api(`sales/options/?company=${company}`), auth())];
        if (kind === "invoices") { fetches.push(axios.get(api(`sales/${record.id}/`), auth())); if (canPayments) fetches.push(axios.get(api(`receipts/?company=${company}&sale=${record.id}&page=${page}`), auth())); }
        else fetches.push(axios.get(api(`receipts/${record.id}/`), auth()));
        Promise.all(fetches).then((results) => { if (!active) return; setOptions(results[0].data);
            if (kind === "invoices") { setInvoice(results[1].data); setPayments(results[2]?.data || empty); }
            else { setInvoice(null); setPayments({ results: [results[1].data], count: 1 }); }
        }).catch(() => { if (active) setError(w("error")); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    // w follows the application's language through t.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record, kind, company, page, refresh, canPayments, t]);
    useEffect(() => { let active = true; setEvents(empty);
        if (history) axios.get(api(`${history.type}/${history.id}/history/?page=${historyPage}`), auth()).then(({ data }) => { if (active) setEvents(data); }).catch(() => { if (active) setError(w("error")); });
        return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [history, historyPage, t]);
    const change = (key, field, value) => { setSaved(false); setEdits((old) => ({ ...old, [key]: { ...old[key], [field]: value } })); };
    const save = async (type, obj, values, key) => {
        setBusy(true); setError("");
        try { await axios.post(api(`${type}/${obj.id}/assign/`), { expected_revision: obj.revision, ...values, note: edits[key]?.note }, auth()); setSaved(true); setRefresh((old) => old + 1); changed(); }
        catch (failure) { setError(w(failure.response?.status === 409 ? "stale" : "error")); }
        finally { setBusy(false); }
    };
    const audit = (type, obj) => { setHistory({ type, id: obj.id }); setHistoryPage(1); };
    const method = (channel) => t(`finance.receipts.channel.${channel || "unknown"}`);
    return <><Dialog open={Boolean(record)} onClose={() => { if (!busy) close(); }} fullWidth maxWidth="lg"><DialogTitle>{kind === "invoices" ? `${w("code")} · ${record?.code}` : `${w("number")} · ${record?.number}`}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}{saved && <Alert severity="success">{w("saved")}</Alert>}{loading ? <CircularProgress /> : <>
            <Alert severity="info">{w("readonly")}</Alert>
            {invoice && <>
                <Stack direction="row" gap={3} useFlexGap flexWrap="wrap"><Typography>{w("date")}: {invoice.source.date}</Typography><Typography>{w("customer")}: {invoice.source.customer || "—"}</Typography><Typography>{w("invoice_total")}: {formatMoney(invoice.source.invoice_total)}</Typography><Typography>{w("status")}: {invoice.source.status}</Typography></Stack>
                <Stack direction="row" gap={1} useFlexGap flexWrap="wrap"><Button onClick={() => setSource({ source: invoice.source, items: invoice.items, file_name: record.file_name, href: `/finance/sales-imports?batch=${record.batch}` })}>{w("source")}</Button><Button onClick={() => audit("sales", invoice)}>{w("audit")}</Button></Stack>
                {canEdit && !invoice.reconciled ? <Stack direction={{ xs: "column", md: "row" }} gap={2}>
                    <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} label={w("invoiceStudio")} value={edits.invoice?.studio ?? invoice.studio ?? ""} disabled={busy} onChange={(event) => change("invoice", "studio", event.target.value)} sx={{ minWidth: 220 }}><MenuItem value="">{w("unknown")}</MenuItem>{options.studios.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>
                    <TextField label={w("note")} value={edits.invoice?.note || ""} disabled={busy} onChange={(event) => change("invoice", "note", event.target.value)} inputProps={{ maxLength: 2000 }} />
                    <Button disabled={busy || !edits.invoice?.note?.trim() || edits.invoice?.studio === undefined} onClick={() => save("sales", invoice, { studio: edits.invoice.studio || null }, "invoice")}>{w("save")}</Button>
                </Stack> : <Typography>{w("invoiceStudio")}: {invoice.studio_name || w("unknown")}</Typography>}
                <Box component="details"><Box component="summary" sx={{ cursor: "pointer" }}>{w("items")} ({invoice.items.length})</Box><TableContainer><Table size="small"><TableHead><TableRow>{["item", "quantity", "amount"].map((k) => <TableCell key={k}>{w(k)}</TableCell>)}</TableRow></TableHead><TableBody>{invoice.items.map((item, i) => <TableRow key={i}><TableCell>{item.name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatMoney(item.total)}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Box><Divider />
            </>}
            <Typography component="h2" variant="h6">{w(kind === "invoices" ? "linkedPayments" : "paymentDetails")} ({payments.count})</Typography>
            {!canPayments ? <Alert severity="info">{w("paymentDetailsAccess")}</Alert> : <>
                {!payments.count && <Typography>{w("noPayments")}</Typography>}
                {[...new Map(payments.results.filter((payment) => payment.matching_review).map((payment) => [payment.matching_review.invoice_id, payment])).values()].map((payment) => <PaymentMatchingReview key={payment.matching_review.invoice_id} payment={payment} canReview={canReview} changed={() => { setRefresh((value) => value + 1); changed(); }} w={w} t={t} />)}
                {payments.results.map((payment) => { const edit = edits[payment.id] || {}; return <Paper variant="outlined" key={payment.id} sx={{ p: 2 }}><Stack spacing={2}>
                    <Stack direction="row" gap={3} useFlexGap flexWrap="wrap"><Typography>{w("number")}: {payment.number}</Typography><Typography>{w("date")}: {payment.source.date}</Typography><Typography>{w("amount")}: {formatMoney(payment.source.amount)} {payment.source.currency}</Typography><Typography>{w("original_method")}: {payment.source.original_method}</Typography></Stack>
                    {payment.assignments.channel_review && <Alert severity="warning">{t("finance.receipts.methodReview")}</Alert>}
                    {payment.invoice_problem && <Typography variant="body2">{payment.invoice_problem.file_name} · {w("sourceRows")}: {payment.invoice_problem.source_rows.join(", ")}</Typography>}
                    {payment.link_issue && <Alert severity="warning">{t(`finance.receipts.${payment.invoice_problem?.reason || payment.link_issue}`, payment.link_issue)}</Alert>}
                    {canEdit && !payment.reconciled ? <Stack direction={{ xs: "column", md: "row" }} gap={2} useFlexGap flexWrap="wrap">
                        <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} label={w("channel")} value={edit.channel ?? payment.channel ?? ""} disabled={busy} sx={{ minWidth: 190 }} onChange={(event) => change(payment.id, "channel", event.target.value)}><MenuItem value="">{w("unknown")}</MenuItem>{options.channels.map((c) => <MenuItem key={c.value} value={c.value}>{method(c.value)}</MenuItem>)}</TextField>
                        <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} label={w("studio")} value={edit.studio ?? (payment.assignments.studio_origin === "invoice" ? "" : payment.studio ?? "")} disabled={busy} sx={{ minWidth: 240 }} onChange={(event) => change(payment.id, "studio", event.target.value)}><MenuItem value="">{w("inherit")}{payment.effective_studio_name && payment.assignments.studio_origin === "invoice" ? ` · ${payment.effective_studio_name}` : ""}</MenuItem>{studios.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>
                        <TextField label={w("note")} value={edit.note || ""} disabled={busy} inputProps={{ maxLength: 2000 }} onChange={(event) => change(payment.id, "note", event.target.value)} />
                        <Button disabled={busy || !edit.note?.trim() || (edit.channel === undefined && edit.studio === undefined)} onClick={() => save("receipts", payment, { ...(edit.channel !== undefined ? { channel: edit.channel || null } : {}), ...(edit.studio !== undefined ? { studio: edit.studio || null } : {}) }, payment.id)}>{w("save")}</Button>
                    </Stack> : <Typography>{method(payment.channel)} · {payment.effective_studio_name || w("unknown")}</Typography>}
                    <Stack direction="row" gap={1}><Button onClick={() => setSource({ source: payment.source, file_name: payment.file_name, href: `/finance/payment-imports?batch=${payment.batch}` })}>{w("source")}</Button><Button onClick={() => audit("receipts", payment)}>{w("audit")}</Button></Stack>
                </Stack></Paper>; })}
                <Pages data={payments} page={page} setPage={setPage} busy={busy} w={w} />
            </>}
        </>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{w("close")}</Button></DialogActions></Dialog>
        <SourceDialog data={source} close={() => setSource(null)} w={w} />
        <Dialog open={Boolean(history)} onClose={() => setHistory(null)} fullWidth maxWidth="md"><DialogTitle>{w("audit")}</DialogTitle><DialogContent><Stack spacing={2}>{events.results.map((event) => <Paper variant="outlined" key={event.id} sx={{ p: 2 }}><Typography>{event.created_at} · {event.note || event.action}</Typography>{["before", "after"].map((key) => event[key]?.source && <Box key={key}><Typography>{w(key)} · {w("channel")}: {method(event[key].channel)} · {w("studio")}: {studios.find((s) => s.id === event[key].studio)?.name || w("inherit")}</Typography><SourceFields source={event[key].source} w={w} /></Box>)}</Paper>)}{!events.count && <Typography>{w("historyNone")}</Typography>}<Pages data={events} page={historyPage} setPage={setHistoryPage} busy={false} w={w} /></Stack></DialogContent><DialogActions><Button onClick={() => setHistory(null)}>{w("close")}</Button></DialogActions></Dialog>
    </>;
}

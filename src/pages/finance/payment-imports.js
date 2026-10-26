import { useEffect, useState } from "react";
import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const empty = { count: 0, results: [] };
export default function PaymentImports() {
    const { t } = useI18n(); const l = (key) => t(`finance.receipts.${key}`); const access = useAccess(); const router = useRouter();
    const canRead = Boolean(access.finance?.can_enter && access.capabilities?.can_view_finance_bank_accounts && access.capabilities?.can_view_sensitive_finance);
    const canImport = canRead && access.capabilities?.can_import_finance;
    const canEdit = canRead && access.capabilities?.can_edit_finance;
    const [companies, setCompanies] = useState([]); const [company, setCompany] = useState("");
    const [file, setFile] = useState(null); const [fileKey, setFileKey] = useState(0);
    const [history, setHistory] = useState(empty); const [historyPage, setHistoryPage] = useState(1);
    const [batch, setBatch] = useState(null); const [plan, setPlan] = useState(null); const [page, setPage] = useState(1);
    const [receipts, setReceipts] = useState(empty); const [receiptPage, setReceiptPage] = useState(1);
    const [refresh, setRefresh] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const [dialog, setDialog] = useState(null); const [note, setNote] = useState(""); const [channel, setChannel] = useState(""); const [channels, setChannels] = useState([]);
    useEffect(() => {
        let active = true; setCompanies([]); setCompany(""); setBatch(null); setPlan(null); setDialog(null);
        if (canRead) axios.get(api("payment-imports/companies/"), auth()).then(({ data }) => { if (active) { setCompanies(data); setCompany((current) => current || data.find((c) => c.active)?.id || data[0]?.id || ""); } }).catch(() => { if (active) setError(t("finance.receipts.error")); });
        return () => { active = false; };
    }, [canRead, t]);
    useEffect(() => {
        let active = true;
        if (canRead && router.query.batch) axios.get(api(`payment-imports/${encodeURIComponent(router.query.batch)}/`), auth()).then(({ data }) => { if (active) { setCompany(data.company); setBatch(data); setPage(1); } }).catch(() => { if (active) setError(t("finance.receipts.error")); });
        return () => { active = false; };
    }, [canRead, router.query.batch, t]);
    useEffect(() => {
        let active = true; setHistory(empty); setReceipts(empty);
        if (canRead && company) {
            axios.get(api(`payment-imports/?company=${company}&page=${historyPage}`), auth()).then(({ data }) => { if (active) setHistory(data); }).catch(() => { if (active) setError(t("finance.receipts.error")); });
            axios.get(api(`receipts/?company=${company}&page=${receiptPage}`), auth()).then(({ data }) => { if (active) setReceipts(data); }).catch(() => { if (active) setError(t("finance.receipts.error")); });
        }
        return () => { active = false; };
    }, [canRead, company, historyPage, receiptPage, refresh, t]);
    useEffect(() => {
        let active = true; setPlan(null);
        if (canRead && batch) axios.get(api(`payment-imports/${batch.id}/processing/?page=${page}`), auth()).then(({ data }) => { if (active) setPlan(data); }).catch(() => { if (active) setError(t("finance.receipts.error")); });
        return () => { active = false; };
    }, [canRead, batch, page, refresh, t]);
    const upload = async (event) => {
        event.preventDefault(); setBusy(true); setError("");
        try { const form = new FormData(); form.append("company", company); form.append("file", file); const { data } = await axios.post(api("payment-imports/"), form, auth()); setBatch(data); setPage(1); setFile(null); setFileKey((old) => old + 1); setHistoryPage(1); setRefresh((old) => old + 1); }
        catch { setError(l("error")); } finally { setBusy(false); }
    };
    const action = async (path, values) => {
        setBusy(true); setError("");
        try { await axios.post(api(path), values, auth()); setDialog(null); setNote(""); setRefresh((old) => old + 1); }
        catch (failure) { setError(failure.response?.status === 409 ? l("stale") : l("error")); }
        finally { setBusy(false); }
    };
    const undoPreview = async () => {
        setBusy(true); setError("");
        try { const { data } = await axios.get(api(`payment-imports/${batch.id}/undo-preview/`), auth()); setNote(""); setDialog({ type: "undo", data }); }
        catch { setError(l("error")); } finally { setBusy(false); }
    };
    const reviewRow = async (row, type) => {
        setBusy(true); setError("");
        try { const { data: source } = await axios.get(api(`payment-imports/${batch.id}/source-row/?row=${row.row_id}`), auth()); setNote(""); setDialog({ type, row, source, token: plan.token }); }
        catch { setError(l("error")); } finally { setBusy(false); }
    };
    const edit = async (receipt) => {
        setBusy(true); setError("");
        try { const { data } = await axios.get(api("receipts/options/"), auth()); setChannels(data.channels); setChannel(receipt.channel); setNote(""); setDialog({ type: "assign", receipt }); }
        catch { setError(l("error")); } finally { setBusy(false); }
    };
    const controls = (data, current, setter) => <Stack direction="row" spacing={2} alignItems="center"><Button disabled={busy || !data.previous} onClick={() => setter(current - 1)}>{l("previous")}</Button><Typography>{l("page")} {current} · {data.count}</Typography><Button disabled={busy || !data.next} onClick={() => setter(current + 1)}>{l("next")}</Button></Stack>;
    return <MainPage><Head><title>{l("title")} | Beness Analytics</title></Head><Stack spacing={2} sx={{ p: 3, maxWidth: 1400, width: "100%", minWidth: 0, boxSizing: "border-box" }}>
        <Link href="/finance">{l("back")}</Link><Typography component="h1" variant="h4">{l("title")}</Typography>
        <Alert severity="info">{l("intro")}</Alert>
        {!canRead ? <Alert severity="warning">{l("denied")}</Alert> : <>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select label={l("company")} value={company} disabled={busy} onChange={(event) => { setCompany(event.target.value); setBatch(null); setDialog(null); setHistoryPage(1); setReceiptPage(1); setFile(null); setFileKey((old) => old + 1); }}>{companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>
            {canImport && <Paper variant="outlined" component="form" onSubmit={upload} sx={{ p: 2 }}><Stack spacing={2}><Typography>{l("reportHelp")}</Typography><Box component="input" key={fileKey} type="file" accept=".xlsx,.csv" aria-label={l("file")} disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} /><Button type="submit" disabled={busy || !company || !file || file.size > 5 * 1024 * 1024 || !companies.find((c) => c.id === Number(company))?.active}>{l("upload")}</Button></Stack></Paper>}
            <Typography component="h2" variant="h5">{l("history")}</Typography><Button disabled={busy} onClick={() => setRefresh((old) => old + 1)}>{l("refresh")}</Button>
            {history.results.map((entry) => <Paper variant="outlined" key={entry.id} sx={{ p: 2 }}><Stack direction="row" spacing={2} useFlexGap flexWrap="wrap"><Typography>#{entry.id} · {entry.file_name} · {l(entry.origin)}{entry.selected_month ? ` · ${entry.selected_month.slice(0, 7)}` : ""}</Typography><Button disabled={busy} onClick={() => { setBatch(entry); setPage(1); setError(""); }}>{l("open")}</Button></Stack></Paper>)}
            {controls(history, historyPage, setHistoryPage)}
            {batch && <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
                <Typography component="h2" variant="h5">{l("plan")} #{batch.id} · {batch.file_name}</Typography>
                <Typography>{l("sourceRows")}: {batch.summary.rows} · {l("sourceAmount")}: {batch.summary.amount_total} DOP</Typography>
                <Alert severity="info">{l("planHelp")}</Alert>
                {batch.file_issues.map((code) => <Alert severity="error" key={code}>{t(`finance.migration.fileIssue.${code}`, l("invalidFile"))}</Alert>)}
                {!plan ? <CircularProgress /> : <>
                    <Typography>{l("status")}: {l(plan.posting?.status || "not_imported")}</Typography>
                    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">{Object.entries(plan.counts).map(([key, count]) => <Typography key={key}>{l(key)}: {count}</Typography>)}</Stack>
                    {plan.can_commit && <Button variant="contained" disabled={busy} onClick={() => setDialog({ type: "commit", token: plan.token })}>{l("commit")}</Button>}
                    {plan.can_undo && <Button color="warning" disabled={busy} onClick={undoPreview}>{l("undoPreview")}</Button>}
                    <TableContainer><Table size="small"><TableHead><TableRow>{["row", "number", "date", "invoice", "amount", "method", "outcome", "link", "review"].map((k) => <TableCell key={k}>{l(k)}</TableCell>)}</TableRow></TableHead><TableBody>{plan.rows.results.map((row) => <TableRow key={row.row_id}><TableCell>{row.source_row}</TableCell><TableCell>{row.number || "—"}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.date || "—"}</TableCell><TableCell>{row.invoice_code || "—"}</TableCell><TableCell>{row.amount || "—"}</TableCell><TableCell>{row.method || row.original_method || "—"}</TableCell><TableCell>{l(row.resolution || row.outcome)}</TableCell><TableCell>{row.receipt ? l(row.receipt.link_issue || "invoice_linked") : "—"}</TableCell><TableCell>{row.issues.map((i, index) => <Typography key={index} variant="body2">{t(`finance.payments.issue.${i.code}`, i.code)}</Typography>)}<Button disabled={busy} onClick={() => reviewRow(row, "source")}>{l("source")}</Button>{plan.can_review && row.resolution === "pending" && <Button disabled={busy} onClick={() => reviewRow(row, "retain")}>{l("retain")}</Button>}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
                    {controls(plan.rows, page, setPage)}
                </>}
            </Stack></Paper>}
            <Typography component="h2" variant="h5">{l("receipts")}</Typography><Typography>{l("receiptsHelp")}</Typography>
            <TableContainer><Table size="small"><TableHead><TableRow>{["number", "date", "invoice", "amount", "method", "studio", "link", "edit"].map((k) => <TableCell key={k}>{l(k)}</TableCell>)}</TableRow></TableHead><TableBody>{receipts.results.map((r) => <TableRow key={r.id}><TableCell>{r.number}</TableCell><TableCell>{r.source.date}</TableCell><TableCell>{r.invoice_code}</TableCell><TableCell>{r.source.amount}</TableCell><TableCell>{l(`channel.${r.channel || "unknown"}`)}{r.assignments.channel_review && <Typography variant="caption" display="block">{l("methodReview")}</Typography>}</TableCell><TableCell>{r.effective_studio_name || r.source.location || "—"}{r.assignments.studio_origin === "manual_pending" && <Typography variant="caption" display="block">{l("studioReview")}</Typography>}</TableCell><TableCell>{l(r.link_issue || "invoice_linked")}</TableCell><TableCell>{canEdit && !r.reconciled && <Button disabled={busy} onClick={() => edit(r)}>{l("edit")}</Button>}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
            {controls(receipts, receiptPage, setReceiptPage)}
        </>}
    </Stack><Dialog open={Boolean(dialog) && canRead} onClose={() => !busy && setDialog(null)} fullWidth maxWidth={dialog?.source ? "lg" : "sm"}><DialogTitle>{l(dialog?.type || "review")}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {dialog?.type === "commit" && <Alert severity="warning">{l("commitHelp")}</Alert>}
        {dialog?.type === "retain" && <><Typography>{l("retainHelp")}</Typography><Typography>{l("incoming")}: {dialog.row.amount} · {dialog.row.date} · {dialog.row.invoice_code} · {dialog.row.method || dialog.row.original_method || "—"} · {dialog.row.location || "—"}</Typography><Typography>{l("current")}: {dialog.row.receipt?.source.amount} · {dialog.row.receipt?.source.date} · {dialog.row.receipt?.source.invoice_code} · {l(`channel.${dialog.row.receipt?.channel || "unknown"}`)} · {dialog.row.receipt?.source.location || "—"}</Typography></>}
        {dialog?.source && <>
            {dialog.row.receipt && <Typography>{l("currentMethod")}: {l(`channel.${dialog.row.receipt.channel || "unknown"}`)}</Typography>}
            <TableContainer><Table size="small"><TableHead><TableRow><TableCell>{l("field")}</TableCell><TableCell>{l("incoming")}</TableCell><TableCell>{l("storedSource")}</TableCell></TableRow></TableHead><TableBody>{["number", "date", "amount", "currency", "invoice_code", "original_method", "account", "customer", "customer_id", "method", "location"].map((key) => <TableRow key={key}><TableCell>{t(`finance.payments.${key}`, key)}</TableCell><TableCell>{dialog.source[key] ?? "—"}</TableCell><TableCell>{dialog.row.receipt?.source[key] ?? "—"}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
            <Box component="details"><Box component="summary">{l("cells")}</Box><TableContainer><Table size="small"><TableHead><TableRow>{["cell", "column", "value", "formula"].map((key) => <TableCell key={key}>{t(`finance.payments.${key}`)}</TableCell>)}</TableRow></TableHead><TableBody>{dialog.source.cells.map((cell) => <TableRow key={cell.cell}><TableCell>{cell.cell}</TableCell><TableCell>{cell.column_label}</TableCell><TableCell>{typeof cell.readable_value === "boolean" ? t(`finance.payments.${cell.readable_value ? "yes" : "no"}`) : cell.readable_value ?? "—"}</TableCell><TableCell>{cell.formula || "—"}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Box>
        </>}
        {dialog?.type === "undo" && <Typography>{l("eligible")}: {dialog.data.eligible.length} · {l("protected")}: {dialog.data.protected.length} · {l("reused")}: {dialog.data.reused}</Typography>}
        {dialog?.type === "assign" && <TextField select label={l("method")} value={channel} onChange={(event) => setChannel(event.target.value)}><MenuItem value="">{l("unknown")}</MenuItem>{channels.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}</TextField>}
        {dialog && !["commit", "source"].includes(dialog.type) && <TextField label={l("note")} value={note} onChange={(event) => setNote(event.target.value)} multiline inputProps={{ maxLength: 2000 }} />}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setDialog(null)}>{l("cancel")}</Button>{dialog?.type !== "source" && <Button disabled={busy || !dialog || (dialog.type !== "commit" && !note.trim())} onClick={() => {
        if (dialog.type === "commit") action(`payment-imports/${batch.id}/commit/`, { expected_plan: dialog.token });
        if (dialog.type === "retain") action(`payment-imports/${batch.id}/retain/`, { expected_plan: dialog.token, decision_id: dialog.row.decision_id, expected_revision: dialog.row.decision_revision, note });
        if (dialog.type === "undo") action(`payment-imports/${batch.id}/undo/`, { expected_plan: dialog.data.token, note });
        if (dialog.type === "assign") action(`receipts/${dialog.receipt.id}/assign/`, { expected_revision: dialog.receipt.revision, channel: channel || null, note });
    }}>{l("confirm")}</Button>}</DialogActions></Dialog></MainPage>;
}

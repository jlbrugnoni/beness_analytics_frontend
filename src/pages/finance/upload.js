import InvoiceSourceReview, { InvoiceImportFilters } from "@/components/finance/InvoiceSourceReview";
import { formatMoney } from "@/utils/formatMoney";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { api, auth, empty, legacy, routes, Pages, SourceDialog, useWorkspace, WorkspaceFrame } from "@/components/finance/workspace/common";
import BankImportReviewDialog from "@/components/finance/BankImportReviewDialog";

export default function FinanceUpload() {
    const router = useRouter();
    const { access, canRead, options, loading, error, setError, w, t } = useWorkspace();
    const [company, setCompany] = useState(""); const [type, setType] = useState("bank"); const [account, setAccount] = useState("");
    const [file, setFile] = useState(null); const [fileKey, setFileKey] = useState(0); const [busy, setBusy] = useState(false);
    const [batch, setBatch] = useState(null); const [plan, setPlan] = useState(null); const [page, setPage] = useState(1); const [pending, setPending] = useState(false);
    const [history, setHistory] = useState(empty); const [historyPage, setHistoryPage] = useState(1); const [refresh, setRefresh] = useState(0);
    const [source, setSource] = useState(null); const [confirm, setConfirm] = useState(false); const [done, setDone] = useState(false);
    const [invoiceFilters, setInvoiceFilters] = useState({ outcome: "all", search: "" });
    const [operation, setOperation] = useState("commit");
    const [review, setReview] = useState(false);
    const canBank = Boolean(access.capabilities?.can_view_finance_bank_accounts); const canImport = Boolean(access.capabilities?.can_import_finance);
    const selected = options.companies.find((c) => c.id === Number(company));
    const accounts = options.accounts.filter((a) => a.company_id === Number(company) && a.kind === "bank");
    const ready = canRead && company && (type !== "bank" || account) && (type === "invoices" || canBank);
    const select = (value) => { setBatch(value ? { ...value } : null); setPlan(null); setPage(1); setDone(false); setSource(null); setReview(false); setOperation("commit"); setInvoiceFilters({ outcome: "all", search: "" }); setError(""); };
    const reset = () => { select(null); setFile(null); setFileKey((old) => old + 1); setHistory(empty); setHistoryPage(1); };
    useEffect(() => { if (router.query.company && options.companies.some((c) => c.id === Number(router.query.company))) setCompany(String(router.query.company)); }, [router.query.company, options.companies]);
    useEffect(() => { if (!canRead) { setBatch(null); setSource(null); setConfirm(false); setReview(false); setPlan(null); setCompany(""); } }, [canRead]);
    useEffect(() => { let active = true; setHistory(empty);
        if (!ready) return undefined;
        const params = new URLSearchParams({ [type === "bank" ? "account" : "company"]: type === "bank" ? account : company, page: historyPage });
        axios.get(api(`${routes[type]}/?${params}`), auth()).then(({ data }) => { if (active) setHistory(data); }).catch(() => { if (active) setError(t("finance.workspace.error")); });
        return () => { active = false; };
    }, [ready, company, account, type, historyPage, refresh, setError, t]);
    useEffect(() => { let active = true; setPlan(null);
        if (!batch) return undefined;
        setPending(true);
        axios.get(api(`${routes[type]}/${batch.id}/processing/?page=${page}${type === "invoices" ? `&outcome=${invoiceFilters.outcome}&search=${encodeURIComponent(invoiceFilters.search)}` : ""}`), auth()).then(({ data }) => { if (active) setPlan(data); }).catch(() => { if (active) setError(t("finance.workspace.error")); }).finally(() => { if (active) setPending(false); });
        return () => { active = false; };
    }, [batch, type, page, refresh, invoiceFilters, setError, t]);
    const upload = async (event) => { event.preventDefault(); setBusy(true); setError("");
        try { const form = new FormData(); form.append("file", file); if (type === "bank") { form.append("account", account); form.append("provider", selected.country === "ES" ? "caixa" : "popular"); } else form.append("company", company);
            const { data } = await axios.post(api(`${routes[type]}/`), form, auth()); select(data); setFile(null); setFileKey((old) => old + 1); setRefresh((old) => old + 1); setHistoryPage(1);
        } catch (failure) { const detail = failure.response?.data; const messages = typeof detail === "object" && detail ? Object.values(detail).flat().filter((value) => typeof value === "string") : []; setError(messages.length ? messages.join(" ") : w("error")); } finally { setBusy(false); }
    };
    const commit = async () => { setBusy(true); setError("");
        try { await axios.post(api(`${routes[type]}/${batch.id}/${operation}/`), { expected_plan: plan.token }, auth()); setConfirm(false); setDone(true); setRefresh((old) => old + 1); }
        catch (failure) { setConfirm(false); setError(w(failure.response?.status === 409 ? "stale" : "error")); } finally { setBusy(false); }
    };
    const original = async () => { setBusy(true); setError(""); try { const { data } = await axios.get(api(`${routes[type]}/${batch.id}/original/`), { ...auth(), responseType: "blob" }); const url = URL.createObjectURL(data); const a = document.createElement("a"); a.href = url; a.download = batch.file_name; a.click(); URL.revokeObjectURL(url); } catch { setError(w("error")); } finally { setBusy(false); } };
    const reread = async () => { setBusy(true); setError(""); try { const { data } = await axios.post(api(`payment-imports/${batch.id}/reread/`), {}, auth()); select(data); setRefresh((old) => old + 1); } catch { setError(w("error")); } finally { setBusy(false); } };
    const sourceRow = async (row) => { setError("");
        if (type !== "payments") { setSource({ source: row.source, items: row.items, file_name: batch.file_name, source_rows: row.source_rows, issues: (row.review_issues || row.issues || []).map((code) => t(`finance.${type === "bank" ? "import.issue" : "sales"}.${code}`, code)) }); return; }
        try { const { data } = await axios.get(api(`payment-imports/${batch.id}/source-row/?row=${row.row_id}`), auth()); setSource({ source: data, cells: data.cells, file_name: batch.file_name, issues: (data.issues || []).map((issue) => t(`finance.payments.issue.${issue.code}`, issue.code)) }); } catch { setError(w("error")); }
    };
    const summary = batch?.summary || {}; const range = batch?.date_range || [summary.first_bank_date || summary.first_date, summary.last_bank_date || summary.last_date];
    const rows = plan?.rows || empty;
    return <WorkspaceFrame title={w("upload")} current="upload" company={company}>
        {!canRead ? <Alert severity="warning">{w("denied")}</Alert> : <>
            {error && <Alert severity="error">{error}</Alert>}{loading && <CircularProgress />}
            <Paper component="form" variant="outlined" onSubmit={upload} sx={{ p: 2 }}><Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} gap={2}>
                    <TextField select label={w("company")} value={company} disabled={busy} sx={{ minWidth: 260 }} onChange={(event) => { setCompany(String(event.target.value)); setAccount(""); setType(canBank ? "bank" : "invoices"); reset(); }}><MenuItem value="">{w("choose")}</MenuItem>{options.companies.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} · {c.currency}</MenuItem>)}</TextField>
                    <TextField select label={w("report")} value={type} disabled={busy || !company} sx={{ minWidth: 260 }} onChange={(event) => { setType(event.target.value); reset(); }}>{[...(canBank ? ["bank"] : []), ...(selected?.country === "DO" ? ["invoices", ...(canBank ? ["payments"] : [])] : [])].map((key) => <MenuItem key={key} value={key}>{w(key === "invoices" ? "invoiceReport" : key)}</MenuItem>)}</TextField>
                    {type === "bank" && <TextField select label={w("account")} value={account} disabled={busy || !company} sx={{ minWidth: 220 }} onChange={(event) => { setAccount(String(event.target.value)); reset(); }}><MenuItem value="">{w("unknown")}</MenuItem>{accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}</TextField>}
                </Stack>
                {selected?.country === "ES" && <Alert severity="info">{w("spain")}</Alert>}
                <Typography variant="body2">{w("fileHelp")}</Typography>
                {file?.size > 5 * 1024 * 1024 && <Alert severity="error">{w("fileLimit")}</Alert>}
                {canImport && <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="center"><Box component="input" key={fileKey} type="file" accept={type === "payments" ? ".xlsx,.csv" : ".csv"} aria-label={w("file")} disabled={busy || !ready} onChange={(event) => setFile(event.target.files?.[0] || null)} /><Button variant="contained" type="submit" disabled={busy || !ready || !file || file.size > 5 * 1024 * 1024 || !selected?.active || (type === "bank" && !accounts.find((a) => a.id === Number(account))?.active)}>{w("preview")}</Button></Stack>}
            </Stack></Paper>
            {batch && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
                <Typography component="h2" variant="h6">{batch.file_name}</Typography>
                <Alert severity={batch.file_issues.length ? "error" : done || plan?.posting?.status === "active" ? "success" : "info"}>{w(batch.file_issues.length ? "failed" : plan?.posting?.status === "undone" ? "undone" : plan?.posting?.status === "partial_undo" ? "partial_undo" : done || plan?.posting?.status === "active" ? "imported" : "ready")}</Alert>
                {batch.file_issues.map((code) => <Typography key={code}>{t(`finance.${type === "payments" ? "migration.fileIssue" : type === "bank" ? "import.issue" : "sales"}.${code}`, code)}</Typography>)}
                <Typography>{w("range")}: {range[0] || "—"} → {range[1] || "—"} · {w("rows")}: {summary.rows ?? summary.valid_rows ?? summary.invoice_count ?? "—"}</Typography>
                <Typography>{type === "bank" ? `${w("credit")}: ${formatMoney(summary.credit_total ?? "0.00")} · ${w("debit")}: ${formatMoney(summary.debit_total ?? "0.00")}` : `${w(type === "payments" ? "incomingTotal" : "amount")}: ${formatMoney(summary.amount_total ?? summary.paid_total)}`} {selected?.currency}</Typography>
                <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">{canImport && <Button disabled={busy} onClick={original}>{w("download")}</Button>}<Button component={Link} href={`/finance/records?company=${company}`}>{w("viewRecords")}</Button><Button component={Link} href={`/finance/${legacy[type]}?batch=${batch.id}`}>{w("advanced")}</Button>{canImport && type === "payments" && batch.file_issues.length > 0 && batch.posting_status === "not_imported" && <Button disabled={busy} onClick={reread}>{w("retry")}</Button>}</Stack>
                {pending ? <CircularProgress /> : plan && <>
                    {type === "bank" && plan.posting && plan.pending_count > 0 && <Stack direction="row" gap={2} alignItems="center"><Typography>{w("pending")}: {plan.pending_count}</Typography><Button variant="contained" disabled={busy} onClick={() => setReview(true)}>{w("reviewPending")}</Button></Stack>}
                    {type === "invoices" && plan.posting && plan.pending_count > 0 && <Stack spacing={1}><Typography>{w("pending")}: {plan.pending_count}</Typography>{plan.can_review && plan.ready_count > 0 && <Button variant="contained" sx={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => { setOperation("apply-pending"); setConfirm(true); }}>{w("linkRecognizedInvoices")} ({plan.ready_count})</Button>}</Stack>}
                    <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">{Object.entries(plan.counts).filter(([key, value]) => key !== "invalid" || value > (plan.excluded_rows || 0)).map(([key, value]) => <Chip key={key} label={`${w(key)}: ${key === "invalid" ? value - (plan.excluded_rows || 0) : value}`} />)}{plan.excluded_rows > 0 && <Chip label={`${w("excluded")}: ${plan.excluded_rows}`} />}</Stack>
                    {plan.can_commit && <Button variant="contained" sx={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => { setOperation("commit"); setConfirm(true); }}>{w("confirm")}</Button>}
                    {type === "invoices" && <><Typography variant="body2">{t("finance.sales.rejectedHelp")} ({plan.invalid_count || 0})</Typography><InvoiceImportFilters value={invoiceFilters} onChange={(value) => { setInvoiceFilters(value); setPage(1); }} t={t} /></>}
                    <TableContainer><Table size="small"><TableHead><TableRow>{["number", "date", type === "bank" ? "description" : "customer", "amount", "outcome", "source"].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>{rows.results.map((row) => { const facts = row.source || row; const amount = facts.amount ?? facts.invoice_total; const outcome = row.resolution || row.outcome; const excluded = row.kind === "egreso"; return <TableRow key={row.row_id || row.invoice_id}><TableCell>{row.code || row.number || facts.reference || facts.serial || "—"}{type === "payments" && <Typography variant="caption" display="block">{facts.invoice_code || "—"}</Typography>}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{facts.date || facts.bank_date}</TableCell><TableCell>{facts.customer || facts.description || "—"}</TableCell><TableCell>{amount === "" || amount == null ? "—" : formatMoney(amount)}</TableCell><TableCell>{w(excluded ? "excluded" : outcome)}{type === "invoices" && <InvoiceSourceReview row={row} t={t} />}</TableCell><TableCell><Button disabled={busy} onClick={() => sourceRow(row)}>{w("source")}</Button></TableCell></TableRow>; })}</TableBody></Table></TableContainer>
                    <Pages data={rows} page={page} setPage={setPage} busy={busy || pending} w={w} />
                </>}
            </Stack></Paper>}
            {ready && <Box component="details"><Box component="summary" sx={{ cursor: "pointer" }}>{w("history")} ({history.count})</Box><TableContainer><Table size="small"><TableHead><TableRow>{["file_name", "date", "status", "open"].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>{history.results.map((entry) => <TableRow key={entry.id}><TableCell>{entry.file_name}</TableCell><TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell><TableCell>{w(entry.file_issues.length ? "failedLabel" : entry.processing_status || entry.posting_status || "not_imported")}</TableCell><TableCell><Button disabled={busy} onClick={() => select(entry)}>{w("open")}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>{!history.count && <Typography>{w("historyEmpty")}</Typography>}<Pages data={history} page={historyPage} setPage={setHistoryPage} busy={busy} w={w} /></Box>}
        </>}
        <SourceDialog data={source} close={() => setSource(null)} w={w} />
        {review && batch && canRead && <BankImportReviewDialog batch={batch} close={() => setReview(false)} changed={() => setRefresh((value) => value + 1)} w={w} />}
        <Dialog open={confirm} onClose={() => { if (!busy) setConfirm(false); }}><DialogTitle>{w(operation === "apply-pending" ? "linkRecognizedInvoices" : "confirm")}</DialogTitle><DialogContent><Typography>{batch?.file_name}</Typography><Typography>{w(operation === "apply-pending" ? "linkRecognizedInvoicesHelp" : "confirmHelp")}</Typography>{operation === "apply-pending" && <Typography>{w("unchanged")}: {plan?.ready_count || 0}</Typography>}</DialogContent><DialogActions><Button disabled={busy} onClick={() => setConfirm(false)}>{w("close")}</Button><Button disabled={busy} onClick={commit}>{w("confirm")}</Button></DialogActions></Dialog>
    </WorkspaceFrame>;
}

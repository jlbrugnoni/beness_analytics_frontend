import { formatMoney } from "@/utils/formatMoney";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import SalesPostingPanel from "@/components/finance/SalesPostingPanel";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";

const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/sales-imports/${path}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const empty = { results: [], count: 0 };

export default function SalesImports() {
    const router = useRouter();
    const { t } = useI18n(); const label = (key) => t(`finance.sales.${key}`);
    const issue = (code) => code.startsWith("inconsistent_") ? `${label("inconsistent")} ${label(code.slice(13))}.` : label(code);
    const access = useAccess();
    const canRead = Boolean(access.finance?.can_enter && access.capabilities?.can_view_sensitive_finance);
    const canImport = canRead && access.capabilities?.can_import_finance;
    const [companies, setCompanies] = useState([]); const [companyId, setCompanyId] = useState("");
    const [file, setFile] = useState(null); const [fileKey, setFileKey] = useState(0);
    const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const [loading, setLoading] = useState(false); const [history, setHistory] = useState(empty);
    const [historyPage, setHistoryPage] = useState(1); const [refresh, setRefresh] = useState(0);
    const [batch, setBatch] = useState(null); const [invoices, setInvoices] = useState(empty);
    const [page, setPage] = useState(1); const [kind, setKind] = useState("all");
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [detail, setDetail] = useState(null); const [items, setItems] = useState(empty);
    const [itemPage, setItemPage] = useState(1); const [itemLoading, setItemLoading] = useState(false);
    const [raw, setRaw] = useState(null); const uploadVersion = useRef(0);
    useEffect(() => {
        let active = true;
        setCompanies([]); setCompanyId(""); setBatch(null); setDetail(null); setRaw(null); setError("");
        if (canRead) axios.get(api("companies/"), auth()).then(({ data }) => {
            if (active) { setCompanies(data); if (!router.query.batch) setCompanyId(data.find((item) => item.active)?.id || data[0]?.id || ""); }
        }).catch(() => { if (active) setError(t("finance.sales.error")); });
        return () => { active = false; uploadVersion.current += 1; };
    }, [canRead, t, router.query.batch]);
    useEffect(() => { let active = true;
        if (canRead && router.query.batch) axios.get(api(`${encodeURIComponent(router.query.batch)}/`), auth()).then(({ data }) => { if (active) { setCompanyId(data.company); setBatch(data); setPage(1); } }).catch(() => { if (active) setError(t("finance.sales.error")); });
        return () => { active = false; };
    }, [canRead, router.query.batch, t]);
    useEffect(() => {
        let active = true; setHistory(empty);
        if (!companyId || !canRead) return undefined;
        setLoading(true);
        axios.get(api(`?company=${companyId}&page=${historyPage}`), auth()).then(({ data }) => { if (active) setHistory(data); })
            .catch(() => { if (active) setError(t("finance.sales.error")); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [companyId, historyPage, refresh, canRead, t]);
    useEffect(() => {
        let active = true; setInvoices(empty);
        if (!batch || !canRead) return undefined;
        setInvoiceLoading(true);
        axios.get(api(`${batch.id}/invoices/?page=${page}&kind=${kind}`), auth()).then(({ data }) => { if (active) setInvoices(data); })
            .catch(() => { if (active) setError(t("finance.sales.error")); }).finally(() => { if (active) setInvoiceLoading(false); });
        return () => { active = false; };
    }, [batch, page, kind, canRead, t]);
    useEffect(() => {
        let active = true; setItems(empty);
        if (!detail || !batch || !canRead) return undefined;
        setItemLoading(true);
        axios.get(api(`${batch.id}/rows/?invoice=${detail.id}&page=${itemPage}`), auth()).then(({ data }) => { if (active) setItems(data); })
            .catch(() => { if (active) setError(t("finance.sales.error")); }).finally(() => { if (active) setItemLoading(false); });
        return () => { active = false; };
    }, [detail, batch, itemPage, canRead, t]);
    const open = (value) => { setBatch(value); setPage(1); setKind("all"); setDetail(null); setRaw(null); setError(""); };
    const upload = async (event) => {
        event.preventDefault(); const version = ++uploadVersion.current; setBusy(true); setError("");
        try {
            const form = new FormData(); form.append("company", companyId); form.append("file", file);
            const { data } = await axios.post(api(""), form, auth());
            if (version === uploadVersion.current) { open(data); setFile(null); setFileKey((old) => old + 1); setHistoryPage(1); setRefresh((old) => old + 1); }
        } catch (failure) { if (version === uploadVersion.current) setError(`${label("error")} ${failure.response?.status === 400 ? JSON.stringify(failure.response.data) : ""}`); }
        finally { if (version === uploadVersion.current) setBusy(false); }
    };
    const download = async () => {
        setBusy(true); setError("");
        try {
            const { data } = await axios.get(api(`${batch.id}/original/`), { ...auth(), responseType: "blob" });
            const url = URL.createObjectURL(data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = batch.file_name; anchor.click(); URL.revokeObjectURL(url);
        } catch { setError(label("error")); } finally { setBusy(false); }
    };
    const controls = (data, value, setter, pending) => <Stack direction="row" spacing={2} alignItems="center">
        <Button disabled={pending || !data.previous} onClick={() => setter(value - 1)}>{label("previous")}</Button>
        <Typography>{label("page")} {value} · {data.count}</Typography>
        <Button disabled={pending || !data.next} onClick={() => setter(value + 1)}>{label("next")}</Button>
    </Stack>;
    const company = companies.find((item) => item.id === Number(companyId));
    return <MainPage><Head><title>{label("title")} | Beness Analytics</title></Head><Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1300 }}>
        <Link href="/finance">{t("finance.config.back")}</Link><Typography component="h1" variant="h4">{label("title")}</Typography>
        <Alert severity="info">{label("intro")}</Alert>
        {!canRead ? <Alert severity="warning">{label("denied")}</Alert> : <>
            {error && <Alert severity="error" sx={{ overflowWrap: "anywhere" }}>{error}</Alert>}
            {!companies.length ? <Alert severity="info">{label("noCompanies")}</Alert> : <>
                <TextField select label={label("company")} value={companyId} disabled={busy} onChange={(event) => {
                    setCompanyId(event.target.value); setHistoryPage(1); setBatch(null); setDetail(null); setRaw(null); setFile(null); setFileKey((old) => old + 1); setError("");
                }}>{companies.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} (DOP)</MenuItem>)}</TextField>
                {canImport && <Paper component="form" onSubmit={upload} variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
                    <Typography variant="body2">{label("help")}</Typography>
                    <Box component="input" key={fileKey} type="file" accept=".csv" aria-label={label("file")} disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} />
                    <Button type="submit" variant="contained" disabled={busy || !file || file.size > 5 * 1024 * 1024 || !company?.active}>{label("upload")}</Button>
                </Stack></Paper>}
                <Typography component="h2" variant="h5">{label("history")}</Typography>
                <Button disabled={busy || loading} onClick={() => setRefresh((old) => old + 1)}>{label("refresh")}</Button>
                {loading ? <CircularProgress /> : !history.count ? <Typography>{label("empty")}</Typography> : history.results.map((entry) => <Paper variant="outlined" key={entry.id} sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center"><Typography sx={{ overflowWrap: "anywhere" }}>#{entry.id} · {entry.file_name}</Typography><Chip label={label(entry.status === "failed" ? "failed" : "parsed")} color={entry.status === "failed" ? "error" : "default"} /><Chip label={t(`finance.salesPosting.${entry.processing_status || "not_imported"}`)} /><Button disabled={busy} onClick={() => open(entry)}>{label("open")}</Button></Stack>
                </Paper>)}
                {controls(history, historyPage, setHistoryPage, loading || busy)}
                {batch && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
                    <Typography variant="h6">#{batch.id} · {batch.file_name}</Typography>
                    <Alert severity="info">{label("noPosting")}</Alert>
                    {batch.duplicate_of && <Alert severity="info">{label("duplicate")} #{batch.duplicate_of}</Alert>}
                    {batch.file_issues.map((issue) => <Alert key={issue} severity="error">{label(issue)}</Alert>)}
                    <Typography>{label("invoices")}: {batch.summary.invoice_count} · {label("items")}: {batch.summary.item_rows}</Typography>
                    <Typography>{label("valid")}: {batch.summary.valid_invoices} · {label("review")}: {batch.summary.review_invoices} · {label("cancelled")}: {batch.summary.cancelled_invoices ?? "—"}</Typography>
                    <Typography variant="h6">{label("total")}: {formatMoney(batch.summary.paid_total)}</Typography>
                    <Typography variant="body2">{label("coverage")}</Typography>
                    {(batch.migration_batch ? access.capabilities?.can_import_finance_migration : canImport) && <Button disabled={busy} onClick={download}>{label("download")}</Button>}
                    <TextField select label={label("filter")} value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
                        <MenuItem value="all">{label("all")}</MenuItem><MenuItem value="review">{label("review")}</MenuItem>
                    </TextField>
                    {invoiceLoading ? <CircularProgress /> : <TableContainer><Table size="small"><TableHead><TableRow>{["code", "date", "status", "items", "amount", "sum", "issues", "details"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead><TableBody>
                        {invoices.results.map((entry) => <TableRow key={entry.id}><TableCell>{entry.code || "—"}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{entry.source.date}</TableCell><TableCell>{entry.source.status}</TableCell><TableCell>{entry.item_count}</TableCell><TableCell>{formatMoney(entry.source.invoice_total)}</TableCell><TableCell>{formatMoney(entry.source.item_sum)}</TableCell><TableCell sx={{ overflowWrap: "anywhere" }}>{entry.issues.map(issue).join(" ") || label("none")}</TableCell><TableCell><Button onClick={() => { setDetail(entry); setItemPage(1); setRaw(null); }}>{label("details")}</Button></TableCell></TableRow>)}
                    </TableBody></Table></TableContainer>}
                    {controls(invoices, page, setPage, invoiceLoading)}
                    <SalesPostingPanel key={batch.id} batch={batch} onUpdated={(id, status) => {
                        setHistory((old) => ({ ...old, results: old.results.map((item) => item.id === id ? { ...item, processing_status: status } : item) }));
                    }} />
                </Stack></Paper>}
            </>}
        </>}
    </Stack><Dialog open={Boolean(detail) && canRead} onClose={() => { setDetail(null); setRaw(null); }} fullWidth maxWidth="lg"><DialogTitle>{label("code")} {detail?.code}</DialogTitle><DialogContent><Stack spacing={2}>
        <Typography>{label("studio")}: {detail?.source.cost_center || "—"} · {label("price")}: {detail?.source.price_list || "—"} · {label("method")}: {detail?.source.payment_method || "—"}</Typography>
        {itemLoading ? <CircularProgress /> : <TableContainer><Table size="small"><TableHead><TableRow>{["line", "item", "quantity", "itemTotal", "source"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead><TableBody>{items.results.map((row) => <TableRow key={row.id}><TableCell>{row.source_line}</TableCell><TableCell>{row.parsed.item_name}</TableCell><TableCell>{row.parsed.quantity}</TableCell><TableCell>{formatMoney(row.parsed.item_total)}</TableCell><TableCell><Button onClick={() => setRaw(row)}>{label("source")}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>}
        {controls(items, itemPage, setItemPage, itemLoading)}
        {raw && <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{label("source")} · {raw.source_line}{"\n"}{JSON.stringify(raw.raw, null, 2)}</Typography>}
    </Stack></DialogContent><DialogActions><Button onClick={() => { setDetail(null); setRaw(null); }}>{label("close")}</Button></DialogActions></Dialog></MainPage>;
}

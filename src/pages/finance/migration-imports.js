import { formatMoney, formatFinanceValue, formatFinanceCell } from "@/utils/formatMoney";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import WorkbookPayments from "@/components/finance/WorkbookPayments";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";

const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/migration-imports/${path}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const empty = { results: [], count: 0 };

export default function MigrationImports() {
    const { t } = useI18n(); const label = (key) => t(`finance.migration.${key}`); const access = useAccess();
    const canRead = Boolean(access.finance?.can_enter && access.capabilities?.can_view_finance_bank_accounts && access.capabilities?.can_view_sensitive_finance);
    const canImport = canRead && access.capabilities?.can_import_finance;
    const [companies, setCompanies] = useState([]); const [companyId, setCompanyId] = useState("");
    const [month, setMonth] = useState("2026-09"); const [file, setFile] = useState(null); const [fileKey, setFileKey] = useState(0);
    const [history, setHistory] = useState(empty); const [historyPage, setHistoryPage] = useState(1); const [refresh, setRefresh] = useState(0);
    const [batch, setBatch] = useState(null); const [rows, setRows] = useState(empty); const [page, setPage] = useState(1);
    const [scope, setScope] = useState("selected"); const [basis, setBasis] = useState("bank_date"); const [kind, setKind] = useState("all");
    const [raw, setRaw] = useState(null); const [detail, setDetail] = useState(null);
    const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false); const [rowsLoading, setRowsLoading] = useState(false); const [error, setError] = useState("");
    const uploadVersion = useRef(0);
    useEffect(() => {
        let active = true; setCompanies([]); setCompanyId(""); setBatch(null); setRaw(null); setDetail(null);
        if (canRead) axios.get(api("companies/"), auth()).then(({ data }) => { if (active) { setCompanies(data); setCompanyId(data.find((item) => item.active)?.id || data[0]?.id || ""); } }).catch(() => { if (active) setError(t("finance.migration.error")); });
        return () => { active = false; uploadVersion.current += 1; };
    }, [canRead, t]);
    useEffect(() => {
        let active = true; setHistory(empty);
        if (!companyId || !canRead) return undefined;
        setLoading(true);
        axios.get(api(`?company=${companyId}&page=${historyPage}`), auth()).then(({ data }) => { if (active) setHistory(data); }).catch(() => { if (active) setError(t("finance.migration.error")); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [companyId, historyPage, refresh, canRead, t]);
    useEffect(() => {
        let active = true; setRows(empty);
        if (!batch || !canRead) return undefined;
        setRowsLoading(true);
        axios.get(api(`${batch.id}/rows/?scope=${scope}&basis=${basis}&kind=${kind}&page=${page}`), auth()).then(({ data }) => { if (active) setRows(data); }).catch(() => { if (active) setError(t("finance.migration.error")); }).finally(() => { if (active) setRowsLoading(false); });
        return () => { active = false; };
    }, [batch, page, scope, basis, kind, canRead, t]);
    useEffect(() => {
        let active = true; setRaw(null);
        if (!detail || !batch || !canRead) return undefined;
        axios.get(api(`${batch.id}/source-row/?row=${detail.id}`), auth()).then(({ data }) => { if (active) setRaw(data); }).catch(() => { if (active) setError(t("finance.migration.error")); });
        return () => { active = false; };
    }, [detail, batch, canRead, t]);
    const open = (value) => { setBatch(value); setPage(1); setScope("selected"); setBasis("bank_date"); setKind("all"); setDetail(null); setRaw(null); setError(""); };
    const upload = async (event) => {
        event.preventDefault(); const version = ++uploadVersion.current; setBusy(true); setError("");
        try {
            const form = new FormData(); form.append("company", companyId); form.append("month", month); form.append("file", file);
            const { data } = await axios.post(api(""), form, auth());
            if (version === uploadVersion.current) { open(data); setFile(null); setFileKey((old) => old + 1); setHistoryPage(1); setRefresh((old) => old + 1); }
        } catch (failure) { if (version === uploadVersion.current) setError(`${label("error")} ${failure.response?.status === 400 ? JSON.stringify(failure.response.data) : ""}`); }
        finally { if (version === uploadVersion.current) setBusy(false); }
    };
    const download = async () => {
        setBusy(true); setError("");
        try { const { data } = await axios.get(api(`${batch.id}/original/`), { ...auth(), responseType: "blob" }); const url = URL.createObjectURL(data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = batch.file_name; anchor.click(); URL.revokeObjectURL(url); }
        catch { setError(label("error")); } finally { setBusy(false); }
    };
    const controls = (data, value, setter, pending) => <Stack direction="row" spacing={2} alignItems="center"><Button disabled={pending || !data.previous} onClick={() => setter(value - 1)}>{label("previous")}</Button><Typography>{label("page")} {value} · {data.count}</Typography><Button disabled={pending || !data.next} onClick={() => setter(value + 1)}>{label("next")}</Button></Stack>;
    const company = companies.find((item) => item.id === Number(companyId));
    const summary = batch?.summary;
    const selectedTotals = scope === "all" ? summary?.all_rows : summary?.[`${basis}_months`]?.[summary?.selected_month];
    const totals = (kind === "all" ? selectedTotals : selectedTotals?.by_kind?.[kind]) || { rows: 0, valid_amount_date_rows: 0, review_rows: 0, credit_total: "0.00", debit_total: "0.00" };
    const issueText = (issue) => `${label(`issue.${issue.code}`)} (${label(issue.field === "bank_date" ? "date" : issue.field === "operation_date" ? "operationDate" : issue.field)})`;
    return <MainPage><Head><title>{label("title")} | Beness Analytics</title></Head><Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1350, width: "100%", minWidth: 0, boxSizing: "border-box" }}>
        <Link href="/finance">{t("finance.config.back")}</Link><Typography component="h1" variant="h4">{label("title")}</Typography><Alert severity="info">{label("intro")}</Alert>
        {!canRead ? <Alert severity="warning">{label("denied")}</Alert> : <>
            {error && <Alert severity="error" sx={{ overflowWrap: "anywhere" }}>{error}</Alert>}
            {!companies.length ? <Alert severity="info">{label("noCompanies")}</Alert> : <>
                <TextField select label={label("company")} value={companyId} disabled={busy} onChange={(event) => { setCompanyId(event.target.value); setHistoryPage(1); setBatch(null); setDetail(null); setFile(null); setFileKey((old) => old + 1); setError(""); }}>{companies.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} (DOP)</MenuItem>)}</TextField>
                {canImport && <Paper variant="outlined" component="form" onSubmit={upload} sx={{ p: 2 }}><Stack spacing={2}><Typography variant="body2">{label("help")}</Typography><TextField type="month" label={label("month")} value={month} disabled={busy} required InputLabelProps={{ shrink: true }} onChange={(event) => setMonth(event.target.value)} /><Box component="input" key={fileKey} type="file" accept=".xlsx" aria-label={label("file")} disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} /><Button type="submit" variant="contained" disabled={busy || !file || file.size > 5 * 1024 * 1024 || !company?.active || !month}>{label("upload")}</Button></Stack></Paper>}
                <Typography component="h2" variant="h5">{label("history")}</Typography><Button disabled={busy || loading} onClick={() => setRefresh((old) => old + 1)}>{label("refresh")}</Button>
                {loading ? <CircularProgress /> : !history.count ? <Typography>{label("empty")}</Typography> : history.results.map((entry) => <Paper variant="outlined" key={entry.id} sx={{ p: 2 }}><Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center"><Typography>#{entry.id} · {entry.file_name} · {entry.selected_month.slice(0, 7)}</Typography><Chip label={label(entry.status === "failed" ? "failed" : "sourceParsed")} /><Button disabled={busy} onClick={() => open(entry)}>{label("open")}</Button></Stack></Paper>)}
                {controls(history, historyPage, setHistoryPage, busy || loading)}
                {batch && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
                    <Typography component="h2" variant="h5">{label("preview")} #{batch.id} · {batch.file_name}</Typography>
                    <Alert severity="warning">{label("originHelp")}</Alert><Typography>{label("reviewHelp")}</Typography>
                    {batch.file_issues.map((code) => <Alert key={code} severity="error">{label(`fileIssue.${code}`)}</Alert>)}
                    {summary.totals_are_partial && <Alert severity="error">{label("partial")}</Alert>}
                    {batch.duplicate_of && <Alert severity="info">{label("duplicate")} #{batch.duplicate_of}. {label("duplicateHelp")}</Alert>}
                    <Typography>{label("allRows")}: {summary.all_rows.rows} · {label("ignored")}: {summary.ignored_empty_rows || 0}</Typography><Typography>{label("dates")}: {summary.first_bank_date || "—"} – {summary.last_bank_date || "—"}</Typography><Typography variant="body2">{label("coverage")}</Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <TextField select label={label("scope")} value={scope} onChange={(event) => { setScope(event.target.value); setPage(1); }} sx={{ minWidth: 200 }}>{["selected", "all"].map((key) => <MenuItem key={key} value={key}>{label(key)}{key === "selected" ? ` (${summary.selected_month})` : ""}</MenuItem>)}</TextField>
                        <TextField select label={label("basis")} value={basis} disabled={scope === "all"} onChange={(event) => { setBasis(event.target.value); setPage(1); }} sx={{ minWidth: 200 }}>{["bank_date", "operation_date", "expense_period"].map((key) => <MenuItem key={key} value={key}>{label(key)}</MenuItem>)}</TextField>
                        <TextField select label={label("kind")} value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }} sx={{ minWidth: 150 }}>{["all", "debit", "credit"].map((key) => <MenuItem key={key} value={key}>{label(key === "all" ? "allKinds" : key)}</MenuItem>)}</TextField>
                    </Stack>
                    <Typography>{label("valid")}: {totals.valid_amount_date_rows} · {label("review")}: {totals.review_rows}</Typography><Typography>{label("credits")}: {formatMoney(totals.credit_total)} · {label("debits")}: {formatMoney(totals.debit_total)}</Typography>
                    {canImport && <Button disabled={busy} onClick={download}>{label("download")}</Button>}
                    {rowsLoading ? <CircularProgress /> : !rows.count ? <Typography>{label("noScope")}</Typography> : <TableContainer><Table size="small"><TableHead><TableRow>{["sheet", "row", "date", "amount", "description", "expense_period", "operation_date", "category", "location", "issues", "source"].map((key) => <TableCell key={key}>{label(key === "operation_date" ? "operationDate" : key)}</TableCell>)}</TableRow></TableHead><TableBody>{rows.results.map((row) => <TableRow key={row.id}><TableCell>{row.sheet}</TableCell><TableCell>{row.source_row}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.bank_date || "—"}</TableCell><TableCell>{formatMoney(row.amount)}</TableCell><TableCell sx={{ minWidth: 180 }}>{row.parsed.manual_description || "—"}</TableCell><TableCell>{row.parsed.expense_period || "—"}</TableCell><TableCell>{row.operation_date || "—"}</TableCell><TableCell>{row.parsed.category || "—"}{row.parsed.subcategory && ` / ${row.parsed.subcategory}`}</TableCell><TableCell>{row.parsed.location || "—"}</TableCell><TableCell sx={{ minWidth: 230 }}>{row.issues.map((issue, index) => <Typography variant="body2" key={index}>{issueText(issue)}</Typography>)}</TableCell><TableCell><Button onClick={() => setDetail(row)}>{label("source")}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>}
                    {controls(rows, page, setPage, rowsLoading)}
                    <WorkbookPayments key={batch.id} batch={batch} />
                </Stack></Paper>}
            </>}
        </>}
    </Stack><Dialog open={Boolean(detail) && canRead} onClose={() => setDetail(null)} fullWidth maxWidth="lg"><DialogTitle>{label("source")} · {detail?.sheet}!{detail?.source_row}</DialogTitle><DialogContent><Stack spacing={2}>
        {!raw ? <CircularProgress /> : <><Typography>{label("origin")}: {label("unknown")} · {label("legacy_reviewed")}: {typeof raw.parsed.legacy_reviewed === "boolean" ? label(raw.parsed.legacy_reviewed ? "yes" : "no") : raw.parsed.legacy_reviewed || "—"}</Typography>
            {["manual_description", "original_description", "payment_method", "terminal", "location", "reference", "serial", "balance", "legacy_type"].map((key) => <Typography key={key}>{label(key)}: {formatFinanceValue(key, raw.parsed[key]) ?? "—"}</Typography>)}
            <TableContainer><Table size="small"><TableHead><TableRow>{["cell", "column", "value", "formula", "issues"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead><TableBody>{(raw.cells || raw.raw).map((cell) => <TableRow key={cell.cell}><TableCell>{cell.cell}</TableCell><TableCell>{cell.column_label || "—"}</TableCell><TableCell sx={{ overflowWrap: "anywhere" }}>{typeof cell.readable_value === "boolean" ? label(cell.readable_value ? "yes" : "no") : cell.readable_value === "" ? label("emptyValue") : formatFinanceCell(cell) ?? "—"}</TableCell><TableCell sx={{ overflowWrap: "anywhere", maxWidth: 600 }}>{cell.formula || "—"}</TableCell><TableCell>{cell.issue ? label(`issue.${cell.issue}`) : "—"}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
            <Box component="details"><Box component="summary" sx={{ cursor: "pointer" }}>{label("originalEncoding")}</Box><Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(raw.raw, null, 2)}</Typography></Box>
        </>}
    </Stack></DialogContent><DialogActions><Button onClick={() => setDetail(null)}>{label("close")}</Button></DialogActions></Dialog></MainPage>;
}

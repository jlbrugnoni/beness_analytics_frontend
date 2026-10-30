import { normalizeApiNextUrl } from "@/utils/apiPagination";
import { formatMoney } from "@/utils/formatMoney";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import BankPostingPanel from "@/components/finance/BankPostingPanel";
import useI18n from "@/hooks/useI18n";

const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const accountTitle = (item) => `${item.company_name} · ${item.name}${item.name.endsWith(`(${item.currency})`) ? "" : ` (${item.currency})`}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const allPages = async (path) => {
    const rows = []; let next = api(path);
    while (next) { const response = await axios.get(next, auth()); rows.push(...response.data.results); next = normalizeApiNextUrl(response.data.next, process.env.NEXT_PUBLIC_BACKEND_URL); }
    return rows;
};

export default function BankImports() {
    const router = useRouter();
    const { t } = useI18n();
    const access = useAccess();
    const canRead = Boolean(access.finance?.can_enter && access.capabilities?.can_view_finance_bank_accounts && access.capabilities?.can_view_sensitive_finance);
    const canImport = Boolean(canRead && access.capabilities?.can_import_finance);
    const label = (key) => t(`finance.import.${key}`);
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState("");
    const account = accounts.find((item) => item.id === Number(accountId));
    const [provider, setProvider] = useState("popular");
    const [file, setFile] = useState(null);
    const [fileKey, setFileKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [history, setHistory] = useState({ results: [], next: null, previous: null, count: 0 });
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [rows, setRows] = useState({ results: [], next: null, previous: null, count: 0 });
    const [rowsLoading, setRowsLoading] = useState(false);
    const [rowsPage, setRowsPage] = useState(1);
    const [kind, setKind] = useState("data");
    const [raw, setRaw] = useState(null);
    const historyVersion = useRef(0);
    const rowsVersion = useRef(0);
    const errorText = (failure) => failure.response?.status === 403 ? label("denied") :
        typeof failure.response?.data === "object" ? Object.entries(failure.response.data).map(([key, value]) =>
            `${["detail", "non_field_errors"].includes(key) ? "" : `${label(key)}: `}${Array.isArray(value) ? value.join(" ") : String(value)}`).join("\n") : label("error");
    useEffect(() => {
        let active = true;
        if (!canRead) { setAccounts([]); setAccountId(""); setSelected(null); setHistory({ results: [] }); setLoading(false); return undefined; }
        setLoading(true); setError(null);
        Promise.all([allPages("accounts/"), allPages("companies/")]).then(([items, companies]) => {
            if (!active) return;
            const supported = items.filter((item) => item.kind === "bank" && companies.some((company) => company.id === item.company &&
                ((company.country_code === "DO" && item.currency === "DOP") || (company.country_code === "ES" && item.currency === "EUR")))).map((item) => {
                const company = companies.find((entry) => entry.id === item.company);
                return { ...item, company_name: company.name, company_active: company.active };
            });
            setAccounts(supported);
            const first = supported.find((item) => item.active && item.company_active && item.statement_imports_expected) || supported.find((item) => item.active && item.company_active) || supported[0];
            if (!router.query.batch) { setAccountId(first?.id || ""); setProvider(first?.currency === "EUR" ? "caixa" : "popular"); }
        }).catch((failure) => { if (active) setError(failure.response?.status === 403 ? t("finance.import.denied") : t("finance.import.error")); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [canRead, t, router.query.batch]);
    useEffect(() => { let active = true;
        if (canRead && router.query.batch) axios.get(api(`bank-imports/${encodeURIComponent(router.query.batch)}/`), auth()).then(({ data }) => { if (active) { setAccountId(data.account); setProvider(data.provider); setSelected(data); setRowsPage(1); } }).catch(() => { if (active) setError(t("finance.import.error")); });
        return () => { active = false; };
    }, [canRead, router.query.batch, t]);
    const loadHistory = useCallback(async (page) => {
        const current = ++historyVersion.current;
        if (!accountId || !canRead) { setHistory({ results: [], count: 0 }); return; }
        setHistoryLoading(true);
        try {
            const response = await axios.get(api(`bank-imports/?account=${accountId}&page=${page}`), auth());
            if (current === historyVersion.current) {
                setHistory(response.data);
                setSelected((old) => old?.account === Number(accountId) ? old : (response.data.results[0] || null));
            }
        } catch (failure) { if (current === historyVersion.current) { setHistory({ results: [], count: 0 }); setSelected(null); setError(failure.response?.status === 403 ? t("finance.import.denied") : t("finance.import.error")); } }
        finally { if (current === historyVersion.current) setHistoryLoading(false); }
    }, [accountId, canRead, t]);
    useEffect(() => { loadHistory(historyPage); return () => { historyVersion.current += 1; }; }, [loadHistory, historyPage]);
    useEffect(() => {
        const current = ++rowsVersion.current;
        setRows({ results: [], count: 0 });
        if (!selected || !canRead) { setRowsLoading(false); return undefined; }
        setRowsLoading(true);
        axios.get(api(`bank-imports/${selected.id}/rows/?kind=${kind}&page=${rowsPage}`), auth()).then((response) => {
            if (current === rowsVersion.current) setRows(response.data);
        }).catch((failure) => { if (current === rowsVersion.current) setError(failure.response?.status === 403 ? t("finance.import.denied") : t("finance.import.error")); })
            .finally(() => { if (current === rowsVersion.current) setRowsLoading(false); });
        return () => { rowsVersion.current += 1; };
    }, [selected, canRead, rowsPage, kind, t]);
    const selectBatch = (batch) => { setSelected(batch); setRowsPage(1); setKind("data"); setRaw(null); setError(null); };
    const upload = async (event) => {
        event.preventDefault(); setBusy(true); setError(null);
        try {
            if (!file || file.size > 5 * 1024 * 1024) { setError(label("fileLimit")); return; }
            const form = new FormData(); form.append("account", account.id); form.append("provider", provider); form.append("file", file);
            const response = await axios.post(api("bank-imports/"), form, auth());
            selectBatch(response.data); setFile(null); setFileKey((old) => old + 1); setHistoryPage(1);
            await loadHistory(1);
        } catch (failure) { setError(errorText(failure)); }
        finally { setBusy(false); }
    };
    const download = async () => {
        setBusy(true); setError(null);
        try {
            const response = await axios.get(api(`bank-imports/${selected.id}/original/`), { ...auth(), responseType: "blob" });
            const url = URL.createObjectURL(response.data); const anchor = document.createElement("a");
            anchor.href = url; anchor.download = selected.file_name; anchor.click(); URL.revokeObjectURL(url);
        } catch (failure) { setError(failure.response?.status === 403 ? label("denied") : label("error")); }
        finally { setBusy(false); }
    };
    const summary = selected?.summary;
    const currency = summary?.currency || account?.currency;
    const pageControls = (data, page, setPage, disabled) => <Stack direction="row" spacing={2} alignItems="center">
        <Button disabled={disabled || !data.previous} onClick={() => setPage(page - 1)}>{label("previous")}</Button>
        <Typography>{label("page")} {page} · {data.count || 0} {label("records")}</Typography>
        <Button disabled={disabled || !data.next} onClick={() => setPage(page + 1)}>{label("next")}</Button>
    </Stack>;
    return <MainPage><Head><title>{label("title")} | Beness Analytics</title></Head>
        <Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1250 }}>
            <Link href="/finance">{t("finance.config.back")}</Link>
            <Typography variant="h4" component="h1">{label("title")}</Typography>
            <Alert severity="info">{label("intro")}</Alert>
            {!canRead ? <Alert severity="warning">{label("denied")}</Alert> : loading ? <CircularProgress /> : <>
                {error && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{error}</Alert>}
                {!accounts.length ? <Alert severity="info">{label("noAccounts")}</Alert> : <>
                    <TextField select label={label("account")} value={accountId} disabled={busy} onChange={(event) => {
                        const next = accounts.find((item) => item.id === Number(event.target.value));
                        setAccountId(event.target.value); setProvider(next?.currency === "EUR" ? "caixa" : "popular");
                        setSelected(null); setRaw(null); setKind("data"); setRowsPage(1); setHistoryPage(1); setFile(null); setFileKey((old) => old + 1); setError(null);
                    }}>{accounts.map((item) => <MenuItem key={item.id} value={item.id}>{accountTitle(item)}</MenuItem>)}</TextField>
                    {canImport && <Paper component="form" onSubmit={upload} variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
                        <Typography variant="h6">{label("upload")}</Typography>
                        {!account?.statement_imports_expected && <Alert severity="info">{label("noStatementsExpected")}</Alert>}
                        <TextField select label={label("provider")} value={provider} disabled={busy} onChange={(event) => setProvider(event.target.value)}>
                            <MenuItem value={account?.currency === "EUR" ? "caixa" : "popular"}>{account?.currency === "EUR" ? "Caixa (EUR)" : "Banco Popular (DOP)"}</MenuItem>
                        </TextField>
                        <Typography variant="body2">{label("fileHelp")}</Typography>
                        <Box component="input" key={fileKey} type="file" accept=".csv" aria-label={label("file")} disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} />
                        <Button type="submit" variant="contained" disabled={busy || !file || !account?.active || !account?.company_active}>{busy ? <CircularProgress size={20} /> : label("savePreview")}</Button>
                    </Stack></Paper>}
                    <Typography variant="h5" component="h2">{label("history")}</Typography>
                    <Button disabled={historyLoading || busy} onClick={() => { setError(null); loadHistory(historyPage); }}>{t("access.reload")}</Button>
                    {historyLoading ? <CircularProgress /> : !history.results.length ? <Typography>{label("emptyHistory")}</Typography> : history.results.map((batch) => <Paper variant="outlined" key={batch.id} sx={{ p: 2, borderColor: selected?.id === batch.id ? "primary.main" : "divider" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                            <Stack spacing={0.5} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                                <Typography fontWeight={600}>#{batch.id} · {batch.file_name}</Typography>
                                <Typography variant="body2">{new Date(batch.created_at).toLocaleString()} · {batch.provider} · {label("valid")}: {batch.summary.valid_rows} · {label("invalid")}: {batch.summary.invalid_rows}</Typography>
                                <Chip size="small" sx={{ alignSelf: "flex-start" }} label={label(`status.${batch.status}`)} />
                                {batch.status !== "failed" && <Chip size="small" sx={{ alignSelf: "flex-start" }} label={t(`finance.posting.status.${batch.processing_status || "not_imported"}`)} />}
                            </Stack>
                            <Button disabled={busy} onClick={() => selectBatch(batch)}>{label("open")}</Button>
                        </Stack>
                    </Paper>)}
                    {pageControls(history, historyPage, setHistoryPage, busy || historyLoading)}
                    {selected && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
                        <Typography variant="h5" component="h2">{label("preview")} #{selected.id}</Typography>
                        <Typography sx={{ overflowWrap: "anywhere" }}>{selected.file_name} · {selected.parser_version} · {selected.encoding}</Typography>
                        <Alert severity="info">{label("noFinancialRecords")}</Alert>
                        {selected.duplicate_of && <Alert severity="warning">{label("sameFile")} #{selected.duplicate_of}. {label("repeatHelp")}</Alert>}
                        {selected.file_issues.map((code) => <Alert severity="error" key={code}>{label(`issue.${code}`)}</Alert>)}
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                            {[["credits", summary.credit_total], ["debits", summary.debit_total], ["net", summary.net_total]].map(([key, value]) => <Paper key={key} variant="outlined" sx={{ p: 2, flex: 1 }}>
                                <Typography>{label(key)}</Typography><Typography variant="h6">{formatMoney(value)} {currency}</Typography>
                            </Paper>)}
                        </Stack>
                        <Typography>{label("observedDates")}: {summary.first_bank_date || t("finance.config.unknown")} — {summary.last_bank_date || t("finance.config.unknown")}</Typography>
                        <Typography>{label("valid")}: {summary.valid_rows} · {label("invalid")}: {summary.invalid_rows} · {label("repeated")}: {summary.repeated_occurrences}</Typography>
                        <Typography variant="body2">{label("coverageHelp")}</Typography>
                        {(selected.migration_batch ? access.capabilities?.can_import_finance_migration : canImport) && <Button disabled={busy} onClick={download}>{label("download")}</Button>}
                        <BankPostingPanel key={selected.id} batch={selected} onProcessingUpdated={(id, status) => {
                            setHistory((old) => ({ ...old, results: old.results.map((item) => item.id === id ? { ...item, processing_status: status } : item) }));
                            setSelected((old) => old?.id === id ? { ...old, processing_status: status } : old);
                        }} />
                        <TextField select label={label("rowFilter")} value={kind} onChange={(event) => { setKind(event.target.value); setRowsPage(1); }}>
                            {["data", "invalid", "all"].map((key) => <MenuItem key={key} value={key}>{label(`filter.${key}`)}</MenuItem>)}
                        </TextField>
                        {rowsLoading ? <CircularProgress /> : <TableContainer><Table size="small"><TableHead><TableRow>
                            {["line", "date", "description", "amount", "balance", "issues", "source"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}
                        </TableRow></TableHead><TableBody>{rows.results.map((row) => <TableRow key={row.id}>
                            <TableCell>{row.source_line}{row.source_line_end !== row.source_line && `–${row.source_line_end}`}</TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{row.parsed.bank_date || "—"}</TableCell>
                            <TableCell sx={{ minWidth: 180, maxWidth: 350, overflowWrap: "anywhere" }}>{row.parsed.description || (row.kind !== "data" ? label(`kind.${row.kind}`) : "—")}</TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{formatMoney(row.parsed.amount)}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{formatMoney(row.parsed.balance)}</TableCell>
                            <TableCell>{row.issues.map((code) => <Typography key={code} variant="body2" color="error">{label(`issue.${code}`)}</Typography>)}</TableCell>
                            <TableCell><Button onClick={() => setRaw(row)}>{label("source")}</Button></TableCell>
                        </TableRow>)}</TableBody></Table></TableContainer>}
                        {pageControls(rows, rowsPage, setRowsPage, rowsLoading)}
                    </Stack></Paper>}
                </>}
            </>}
        </Stack>
        <Dialog open={Boolean(raw) && canRead} onClose={() => setRaw(null)} fullWidth maxWidth="md"><DialogTitle>{label("source")} · {label("line")} {raw?.source_line}</DialogTitle>
            <DialogContent><Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(raw?.raw, null, 2)}</Typography></DialogContent>
            <DialogActions><Button onClick={() => setRaw(null)}>{t("finance.config.cancel")}</Button></DialogActions></Dialog>
    </MainPage>;
}

import { formatMoney } from "@/utils/formatMoney";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography } from "@mui/material";
import { api, auth, empty, Pages, SourceDialog, useWorkspace, WorkspaceFrame } from "@/components/finance/workspace/common";
import BankDialog from "@/components/finance/workspace/BankDialog";
import ManualEntryDialog from "@/components/finance/workspace/ManualEntryDialog";
import GeneralCashButton from "@/components/finance/GeneralCashButton";
import InvoiceDialog from "@/components/finance/workspace/InvoiceDialog";

export default function FinanceRecords() {
    const { access, canRead, options, reloadOptions, loading, error, setError, w, t } = useWorkspace(); const router = useRouter();
    const [company, setCompany] = useState(""); const [kind, setKind] = useState("invoices"); const [page, setPage] = useState(1);
    const [creating, setCreating] = useState(false);
    const [filters, setFilters] = useState({ search: "", start: "", end: "", status: "all", studio: "", account: "", category: "", subcategory: "", channel: "", origin: "all", sort: "-date" }); const [applied, setApplied] = useState(filters);
    const [data, setData] = useState(empty); const [pending, setPending] = useState(false); const [refresh, setRefresh] = useState(0);
    const [recognizing, setRecognizing] = useState(false); const [recognitionResult, setRecognitionResult] = useState(null);
    const [record, setRecord] = useState(null); const [source, setSource] = useState(null);
    const canBank = Boolean(access.capabilities?.can_view_finance_bank_accounts); const selected = options.companies.find((c) => c.id === Number(company)); const bank = ["debit", "credit"].includes(kind);
    const studios = options.studios.filter((s) => s.site_id === selected?.site);
    useEffect(() => { if (!canRead) { setRecord(null); setSource(null); setCompany(""); } }, [canRead]);
    useEffect(() => { if (!canBank && bank) { setRecord(null); setSource(null); setData(empty); setKind("invoices"); } }, [canBank, bank]);
    // Site membership is supplied by the backend, never inferred from studio names.
    useEffect(() => { if (router.query.company && options.companies.some((c) => c.id === Number(router.query.company))) setCompany(String(router.query.company)); }, [router.query.company, options.companies]);
    useEffect(() => {
        let active = true; setData(empty);
        if (!canRead || !company || (selected?.country === "ES" && !bank)) return undefined;
        setPending(true); const params = new URLSearchParams({ company, kind, page, ...Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== "")) });
        axios.get(api(`workspace/?${params}`), auth()).then(({ data: result }) => { if (active) setData(result); }).catch(() => { if (active) setError(t("finance.workspace.error")); }).finally(() => { if (active) setPending(false); });
        return () => { active = false; };
    }, [company, kind, page, applied, refresh, canRead, selected?.country, bank, setError, t]);
    // Keep the edit dialog open while refreshing the underlying table after a save.
    const changed = () => setRefresh((old) => old + 1);
    const chooseKind = (value) => { setKind(value); setRecognitionResult(null); setPage(1); setRecord(null); setCreating(false); const next = { ...filters, account: "", studio: "", channel: "", category: "", subcategory: "", status: "all" }; setFilters(next); setApplied(next); setError(""); };
    const recognizeTerminals = async () => {
        setRecognizing(true); setRecognitionResult(null); setError("");
        try { const { data: result } = await axios.post(api("workspace/recognize-terminals/"), { company: Number(company) }, auth()); setRecognitionResult(result.updated); changed(); }
        catch { setError(w("error")); }
        finally { setRecognizing(false); }
    };
    const sort = (key) => { const value = applied.sort === key ? `-${key}` : key; setFilters({ ...filters, sort: value }); setApplied({ ...applied, sort: value }); setPage(1); };
    return <WorkspaceFrame title={w("records")} current="records" company={company}>
        {!canRead ? <Alert severity="warning">{w("denied")}</Alert> : <>
            {error && <Alert severity="error">{error}</Alert>}{loading && <CircularProgress />}
            <TextField select label={w("company")} value={company} sx={{ maxWidth: 520 }} onChange={(event) => { setCompany(String(event.target.value)); setRecognitionResult(null); setPage(1); setError(""); setRecord(null); setFilters({ ...filters, studio: "", account: "", category: "", subcategory: "" }); setApplied({ ...applied, studio: "", account: "", category: "", subcategory: "" }); }}><MenuItem value="">{w("choose")}</MenuItem>{options.companies.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} · {c.currency}</MenuItem>)}</TextField>
            {!company ? <Typography>{w("selectHelp")}</Typography> : <>
                <Tabs value={kind === "unlinked" ? "invoices" : kind} onChange={(_, value) => chooseKind(value)} variant="scrollable" scrollButtons="auto" aria-label={w("records")}><Tab label={w("debit")} value="debit" disabled={!canBank} /><Tab label={w("credit")} value="credit" disabled={!canBank} /><Tab label={w("invoices")} value="invoices" /></Tabs>
                {selected?.country === "ES" && !bank ? <Alert severity="info">{w("spain")}</Alert> : <>
                    {!bank && canBank && <Button sx={{ alignSelf: "flex-start" }} onClick={() => chooseKind(kind === "unlinked" ? "invoices" : "unlinked")}>{w(kind === "unlinked" ? "invoices" : "unlinked")}</Button>}
                    {bank && canBank && <Stack direction="row" gap={1}>
                        {access.capabilities?.can_edit_finance && <Button variant="contained" onClick={() => setCreating(true)}>{w(kind === "debit" ? "createExpense" : "createIncome")}</Button>}
                        {access.capabilities?.can_manage_finance_settings && !options.accounts.some((a) => a.company_id === Number(company) && a.kind === "cash") && <GeneralCashButton company={company} done={reloadOptions} w={w} />}
                    </Stack>}
                    {kind === "credit" && canBank && access.capabilities?.can_edit_finance && <Box><Button disabled={recognizing || pending} onClick={recognizeTerminals}>{w("recognizeTerminals")}</Button><Typography variant="body2">{w("recognizeTerminalsHelp")}</Typography></Box>}
                    {kind === "credit" && recognitionResult !== null && <Alert severity="success">{w("recognizedCount")}: {recognitionResult}</Alert>}
                    <Paper variant="outlined" component="form" sx={{ p: 2 }} onSubmit={(event) => { event.preventDefault(); setApplied(filters); setPage(1); setRefresh((old) => old + 1); setError(""); }}><Stack direction="row" gap={2} useFlexGap flexWrap="wrap">
                        <TextField size="small" label={w("search")} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} sx={{ minWidth: 250 }} />
                        {["start", "end"].map((key) => <TextField key={key} size="small" type="date" label={w(key)} InputLabelProps={{ shrink: true }} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} />)}
                        <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("status")} value={filters.status} sx={{ minWidth: 160 }} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{["all", "review", ...(bank ? [...(kind === "debit" ? ["missing_category"] : ["method_review"]), "reviewed", "unreviewed"] : ["unreconciled", "reconciled"])].map((key) => <MenuItem key={key} value={key}>{w(key)}</MenuItem>)}</TextField>
                        {bank && <TextField select size="small" label={w("origin")} value={filters.origin} onChange={(event) => setFilters({ ...filters, origin: event.target.value })}>{["all", "manual", "report", "migration"].map((key) => <MenuItem key={key} value={key}>{w(key === "all" ? "all" : `origin_${key}`)}</MenuItem>)}</TextField>}
                        {bank && <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("account")} value={filters.account} sx={{ minWidth: 190 }} onChange={(event) => setFilters({ ...filters, account: event.target.value })}><MenuItem value="">{w("all")}</MenuItem>{options.accounts.filter((a) => a.company_id === Number(company)).map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>}
                        {<TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("studio")} value={filters.studio} sx={{ minWidth: 190 }} onChange={(event) => setFilters({ ...filters, studio: event.target.value })}><MenuItem value="">{w("all")}</MenuItem>{studios.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>}
                        {canBank && kind !== "debit" && <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("channel")} value={filters.channel} sx={{ minWidth: 160 }} onChange={(event) => setFilters({ ...filters, channel: event.target.value })}><MenuItem value="">{w("all")}</MenuItem>{["card_terminal", "recurring", "payment_link", "cash", "transfer"].map((key) => <MenuItem key={key} value={key}>{t(`finance.receipts.channel.${key}`)}</MenuItem>)}</TextField>}
                        {kind === "debit" && ["category", "subcategory"].map((field) => <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w(field)} value={filters[field]} sx={{ minWidth: 160 }} key={field} onChange={(event) => setFilters({ ...filters, [field]: event.target.value, ...(field === "category" ? { subcategory: "" } : {}) })}><MenuItem value="">{w("all")}</MenuItem>{(options.categories || []).filter((c) => c.company === Number(company) && (field === "category" ? !c.parent : c.parent === Number(filters.category))).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>)}
                        <Button type="submit" variant="outlined" disabled={pending}>{w("apply")}</Button>
                    </Stack></Paper>
                    <Typography>{w("rows")}: {data.count} · {w("total")}: {formatMoney(data.total ?? "0.00")} {data.currency || selected?.currency}</Typography><Typography variant="body2">{w("totalHelp")}</Typography>
                    {bank && <Typography variant="body2">{w("bankStatusHelp")}</Typography>}
                    {pending ? <CircularProgress /> : <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow>{["number", "date", bank ? "description" : "customer", "amount", bank ? "account" : "studio", bank ? "origin" : kind === "invoices" ? "paymentCount" : "channel", ...(!bank && kind === "invoices" && canBank ? ["channel"] : []), ...(bank ? ["business_description", ...(kind === "debit" ? ["category", "subcategory"] : []), "studio", ...(kind === "credit" ? ["channel"] : []), kind === "debit" ? "expense_period" : "operation_date"] : []), "status", "source", ...(bank ? ["edit"] : [])].map((key) => <TableCell key={key}>{["number", "date", "amount"].includes(key) ? <TableSortLabel active={applied.sort.replace("-", "") === key} direction={applied.sort.startsWith("-") ? "desc" : "asc"} onClick={() => sort(key)}>{w(key)}</TableSortLabel> : w(key)}</TableCell>)}</TableRow></TableHead><TableBody>
                        {data.results.map((row) => <TableRow hover key={row.id}><TableCell>{bank ? row.source.reference || row.source.serial || "—" : <Box><Button onClick={() => setRecord(row)}>{row.code || row.number}</Button>{kind === "unlinked" && <Typography variant="caption" display="block">{row.invoice_code}</Typography>}</Box>}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.source.date || row.source.bank_date}</TableCell><TableCell>{row.source.customer || row.source.description || "—"}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{formatMoney(row.source.invoice_total ?? row.source.amount)} {data.currency}</TableCell><TableCell>{row.account_name || row.studio_name || row.effective_studio_name || w("unknown")}</TableCell><TableCell>{bank ? w(`origin_${row.origin || "report"}`) : kind === "invoices" ? row.payment_count ?? "—" : t(`finance.receipts.channel.${row.channel || "unknown"}`)}</TableCell>{!bank && kind === "invoices" && canBank && <TableCell>{row.payment_methods?.map((channel) => t(`finance.receipts.channel.${channel}`)).join(" / ") || w("unknown")}</TableCell>}{bank && <><TableCell>{row.classification?.description || "—"}</TableCell>{kind === "debit" && <><TableCell>{row.classification_labels?.category_name || "—"}</TableCell><TableCell>{row.classification_labels?.subcategory_name || "—"}</TableCell></>}<TableCell>{row.classification?.administration ? w("administration") : row.classification_labels?.studio_name || w("unknown")}</TableCell>{kind === "credit" && <TableCell>{t(`finance.receipts.channel.${row.classification?.channel || "unknown"}`)}</TableCell>}<TableCell>{kind === "debit" ? row.classification?.expense_period?.slice(0, 7) || "—" : row.classification?.operation_date || "—"}</TableCell></>}<TableCell>{bank ? w(row.classification?.reviewed && !row.needs_review ? "reviewed" : "review") : row.reconciled ? w("reconciled") : row.link_issue ? t(`finance.receipts.${row.link_issue}`, row.link_issue) : row.source.status || w("unreconciled")}{bank && row.reconciled && <Typography variant="caption" display="block">{w("reconciled")}</Typography>}{(!bank && (row.needs_review || row.assignments?.requires_review)) && <Typography variant="caption" display="block">{w("review")}</Typography>}</TableCell><TableCell><Button onClick={() => bank ? setSource({ source: row.source, file_name: row.file_name || w("origin_manual"), href: row.batch ? `/finance/imports?batch=${row.batch}` : undefined }) : setRecord(row)}>{w(bank ? "source" : "open")}</Button></TableCell>{bank && <TableCell><Button onClick={() => setRecord(row)}>{w(access.capabilities?.can_edit_finance && !row.reconciled ? "edit" : "open")}</Button></TableCell>}</TableRow>)}
                        {!data.count && <TableRow><TableCell colSpan={bank ? kind === "debit" ? 14 : 13 : 9}>{w("empty")}</TableCell></TableRow>}
                    </TableBody></Table></TableContainer>}
                    <Pages data={data} page={page} setPage={setPage} busy={pending} w={w} />
                </>}
            </>}
        </>}
        <InvoiceDialog record={bank ? null : record} kind={kind} close={() => setRecord(null)} company={company} studios={studios} canEdit={Boolean(access.capabilities?.can_edit_finance)} canPayments={canBank} changed={changed} w={w} t={t} />
        <BankDialog record={bank ? record : null} close={() => setRecord(null)} canEdit={Boolean(access.capabilities?.can_edit_finance)} optionsForManual={options} company={company} changed={changed} w={w} t={t} />
        {creating && bank && <ManualEntryDialog key={`${company}-${kind}`} company={company} direction={kind} options={options} close={() => setCreating(false)} done={changed} w={w} t={t} />}
        <SourceDialog data={source} close={() => setSource(null)} w={w} />
    </WorkspaceFrame>;
}

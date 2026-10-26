import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography } from "@mui/material";
import { api, auth, empty, Pages, SourceDialog, useWorkspace, WorkspaceFrame } from "@/components/finance/workspace/common";
import InvoiceDialog from "@/components/finance/workspace/InvoiceDialog";

export default function FinanceRecords() {
    const { access, canRead, options, loading, error, setError, w, t } = useWorkspace(); const router = useRouter();
    const [company, setCompany] = useState(""); const [kind, setKind] = useState("invoices"); const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ search: "", start: "", end: "", status: "all", studio: "", account: "", channel: "", sort: "-date" }); const [applied, setApplied] = useState(filters);
    const [data, setData] = useState(empty); const [pending, setPending] = useState(false); const [refresh, setRefresh] = useState(0);
    const [record, setRecord] = useState(null); const [source, setSource] = useState(null);
    const canBank = Boolean(access.capabilities?.can_view_finance_bank_accounts); const selected = options.companies.find((c) => c.id === Number(company)); const bank = ["debit", "credit"].includes(kind);
    const studios = options.studios.filter((s) => s.site_id === selected?.site);
    useEffect(() => { if (!canRead) { setRecord(null); setSource(null); setCompany(""); } }, [canRead]);
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
    const chooseKind = (value) => { setKind(value); setPage(1); setRecord(null); const next = { ...filters, account: "", studio: "", channel: "", status: "all" }; setFilters(next); setApplied(next); setError(""); };
    const sort = (key) => { const value = applied.sort === key ? `-${key}` : key; setFilters({ ...filters, sort: value }); setApplied({ ...applied, sort: value }); setPage(1); };
    return <WorkspaceFrame title={w("records")} current="records" company={company}>
        {!canRead ? <Alert severity="warning">{w("denied")}</Alert> : <>
            {error && <Alert severity="error">{error}</Alert>}{loading && <CircularProgress />}
            <TextField select label={w("company")} value={company} sx={{ maxWidth: 520 }} onChange={(event) => { setCompany(String(event.target.value)); setPage(1); setError(""); setRecord(null); setFilters({ ...filters, studio: "", account: "" }); setApplied({ ...applied, studio: "", account: "" }); }}><MenuItem value="">{w("choose")}</MenuItem>{options.companies.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} · {c.currency}</MenuItem>)}</TextField>
            {!company ? <Typography>{w("selectHelp")}</Typography> : <>
                <Tabs value={kind === "unlinked" ? "invoices" : kind} onChange={(_, value) => chooseKind(value)} variant="scrollable" scrollButtons="auto" aria-label={w("records")}><Tab label={w("debit")} value="debit" disabled={!canBank} /><Tab label={w("credit")} value="credit" disabled={!canBank} /><Tab label={w("invoices")} value="invoices" /></Tabs>
                {selected?.country === "ES" && !bank ? <Alert severity="info">{w("spain")}</Alert> : <>
                    {!bank && canBank && <Button sx={{ alignSelf: "flex-start" }} onClick={() => chooseKind(kind === "unlinked" ? "invoices" : "unlinked")}>{w(kind === "unlinked" ? "invoices" : "unlinked")}</Button>}
                    <Paper variant="outlined" component="form" sx={{ p: 2 }} onSubmit={(event) => { event.preventDefault(); setApplied(filters); setPage(1); setRefresh((old) => old + 1); setError(""); }}><Stack direction="row" gap={2} useFlexGap flexWrap="wrap">
                        <TextField size="small" label={w("search")} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} sx={{ minWidth: 250 }} />
                        {["start", "end"].map((key) => <TextField key={key} size="small" type="date" label={w(key)} InputLabelProps={{ shrink: true }} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} />)}
                        <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("status")} value={filters.status} sx={{ minWidth: 160 }} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{["all", ...(!bank ? ["review"] : []), "unreconciled", "reconciled"].map((key) => <MenuItem key={key} value={key}>{w(key)}</MenuItem>)}</TextField>
                        {bank && <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("account")} value={filters.account} sx={{ minWidth: 190 }} onChange={(event) => setFilters({ ...filters, account: event.target.value })}><MenuItem value="">{w("all")}</MenuItem>{options.accounts.filter((a) => a.company_id === Number(company)).map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>}
                        {!bank && <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("studio")} value={filters.studio} sx={{ minWidth: 190 }} onChange={(event) => setFilters({ ...filters, studio: event.target.value })}><MenuItem value="">{w("all")}</MenuItem>{studios.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>}
                        {!bank && canBank && <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} size="small" label={w("channel")} value={filters.channel} sx={{ minWidth: 160 }} onChange={(event) => setFilters({ ...filters, channel: event.target.value })}><MenuItem value="">{w("all")}</MenuItem>{["card_terminal", "recurring", "payment_link", "cash", "transfer"].map((key) => <MenuItem key={key} value={key}>{t(`finance.receipts.channel.${key}`)}</MenuItem>)}</TextField>}
                        <Button type="submit" variant="outlined" disabled={pending}>{w("apply")}</Button>
                    </Stack></Paper>
                    <Typography>{w("rows")}: {data.count} · {w("total")}: {data.total || "0.00"} {data.currency || selected?.currency}</Typography><Typography variant="body2">{w("totalHelp")}</Typography>
                    {bank && <Alert severity="info">{w("bankHelp")}</Alert>}
                    {pending ? <CircularProgress /> : <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow>{["number", "date", bank ? "description" : "customer", "amount", bank ? "account" : "studio", bank ? "balance" : kind === "invoices" ? "paymentCount" : "channel", ...(!bank && kind === "invoices" && canBank ? ["channel"] : []), "status", "source"].map((key) => <TableCell key={key}>{["number", "date", "amount"].includes(key) ? <TableSortLabel active={applied.sort.replace("-", "") === key} direction={applied.sort.startsWith("-") ? "desc" : "asc"} onClick={() => sort(key)}>{w(key)}</TableSortLabel> : w(key)}</TableCell>)}</TableRow></TableHead><TableBody>
                        {data.results.map((row) => <TableRow hover key={row.id}><TableCell>{bank ? row.source.reference || row.source.serial || "—" : <Box><Button onClick={() => setRecord(row)}>{row.code || row.number}</Button>{kind === "unlinked" && <Typography variant="caption" display="block">{row.invoice_code}</Typography>}</Box>}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.source.date || row.source.bank_date}</TableCell><TableCell>{row.source.customer || row.source.description || "—"}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.source.invoice_total || row.source.amount} {data.currency}</TableCell><TableCell>{row.account_name || row.studio_name || row.effective_studio_name || w("unknown")}</TableCell><TableCell>{bank ? row.source.balance ?? "—" : kind === "invoices" ? row.payment_count ?? "—" : t(`finance.receipts.channel.${row.channel || "unknown"}`)}</TableCell>{!bank && kind === "invoices" && canBank && <TableCell>{row.payment_methods?.map((channel) => t(`finance.receipts.channel.${channel}`)).join(" / ") || w("unknown")}</TableCell>}<TableCell>{row.reconciled ? w("reconciled") : row.link_issue ? t(`finance.receipts.${row.link_issue}`, row.link_issue) : row.source.status || w("unreconciled")}{(row.needs_review || row.assignments?.requires_review) && <Typography variant="caption" display="block">{w("review")}</Typography>}</TableCell><TableCell><Button onClick={() => bank ? setSource({ source: row.source, file_name: row.file_name, href: `/finance/imports?batch=${row.batch}` }) : setRecord(row)}>{w(bank ? "source" : "open")}</Button></TableCell></TableRow>)}
                        {!data.count && <TableRow><TableCell colSpan={9}>{w("empty")}</TableCell></TableRow>}
                    </TableBody></Table></TableContainer>}
                    <Pages data={data} page={page} setPage={setPage} busy={pending} w={w} />
                </>}
            </>}
        </>}
        <InvoiceDialog record={record} kind={kind} close={() => setRecord(null)} company={company} studios={studios} canEdit={Boolean(access.capabilities?.can_edit_finance)} canPayments={canBank} changed={changed} w={w} t={t} />
        <SourceDialog data={source} close={() => setSource(null)} w={w} />
    </WorkspaceFrame>;
}

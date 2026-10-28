import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useI18n from "@/hooks/useI18n";
import ClosureCheckDialog from "@/components/finance/ClosureCheckDialog";
import { api, auth, Pages, useWorkspace, WorkspaceFrame } from "@/components/finance/workspace/common";
import { formatMoney } from "@/utils/formatMoney";

const localMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const validMonth = (value) => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) > 0;
const money = (v) => v === null || v === undefined ? "—" : formatMoney(v);
const differenceColor = (value) => value === null ? "text.secondary" : Number(value) < 0 ? "error.main" : Number(value) > 0 ? "warning.dark" : "text.primary";

function Evidence({ selected, close, company, month, studio, w, t }) {
    const [page, setPage] = useState(1); const [sideFilter, setSideFilter] = useState(selected?.side || "all"); const [data, setData] = useState({ results: [], count: 0 }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    useEffect(() => { let live = true; setData({ results: [], count: 0 }); setError("");
        if (!selected) return undefined;
        setBusy(true); const params = new URLSearchParams({ company, month, page, ...(studio ? { studio } : {}), ...selected });
        if (sideFilter === "all") params.delete("side"); else params.set("side", sideFilter);
        axios.get(api(`closures/evidence/?${params}`), auth()).then(({ data: result }) => { if (live) setData(result); }).catch(() => { if (live) setError(w("error")); }).finally(() => { if (live) setBusy(false); });
        return () => { live = false; };
    }, [selected, company, month, studio, page, sideFilter, w]);
    return <Dialog open={Boolean(selected)} onClose={close} fullWidth maxWidth="lg"><DialogTitle>{w("closure_evidence")}{selected?.day ? ` · ${selected.day}` : ""}</DialogTitle><DialogContent>
        {!selected?.side && <Stack direction="row" gap={1} sx={{ mb: 2 }}>{["all", "expected", "actual"].map((side) => <Button key={side} variant={sideFilter === side ? "contained" : "text"} onClick={() => { setSideFilter(side); setPage(1); }}>{w(side === "all" ? "all" : side === "expected" ? "closure_gross" : "closure_actual")}</Button>)}</Stack>}{error && <Alert severity="error">{error}</Alert>}{busy ? <CircularProgress /> : <TableContainer><Table size="small"><TableHead><TableRow>{["closure_side", "number", "date", "closure_bankDate", "amount", "studio", "closure_reference", "closure_notes"].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>{data.results.map((r) => <TableRow key={`${r.side}-${r.id}`}><TableCell>{w(`closure_${r.side}`)}</TableCell><TableCell>{r.number || r.id}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{r.date || "—"}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{r.bank_date || "—"}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{money(r.amount)} {r.currency}</TableCell><TableCell>{r.studio_name || "—"}</TableCell><TableCell>{r.invoice || r.account_name}<Typography variant="caption" display="block">{r.file_name || r.description}</Typography></TableCell><TableCell>{r.issues.map((key) => w(`closure_issue_${key}`)).join(" · ")}{r.excluded_kind && w(`closure_excluded_${r.excluded_kind}`)}{!r.included && !r.excluded_kind && <Typography variant="caption" display="block">{w("closure_notIncluded")}</Typography>}</TableCell></TableRow>)}{!data.count && <TableRow><TableCell colSpan={8}>{w("empty")}</TableCell></TableRow>}</TableBody></Table></TableContainer>}
        <Pages data={data} page={page} setPage={setPage} busy={busy} w={w} />
    </DialogContent><DialogActions><Button component={Link} href={`/finance/records?company=${company}`}>{w("records")}</Button><Button onClick={close}>{w("close")}</Button></DialogActions></Dialog>;
}

export default function Closures() {
    const { access, canRead, options, loading, error, setError, w, t } = useWorkspace(); const router = useRouter(); const { language } = useI18n();
    const [company, setCompany] = useState(""); const [month, setMonth] = useState(localMonth); const [studio, setStudio] = useState(""); const [refresh, setRefresh] = useState(0);
    const [checking, setChecking] = useState(null);
    const [data, setData] = useState(null); const [busy, setBusy] = useState(false); const [method, setMethod] = useState(null); const [evidence, setEvidence] = useState(null);
    const selected = options.companies.find((c) => c.id === Number(company)); const allowed = canRead && Boolean(access.capabilities?.can_view_finance_bank_accounts);
    useEffect(() => { if (router.query.company && options.companies.some((c) => c.id === Number(router.query.company))) setCompany(String(router.query.company)); }, [router.query.company, options.companies]);
    useEffect(() => { if (validMonth(router.query.month)) setMonth(router.query.month); }, [router.query.month]);
    useEffect(() => { let live = true; setData(null); setMethod(null); setEvidence(null); setChecking(null);
        if (!allowed || !company || !validMonth(month)) return undefined;
        setBusy(true); setError(""); const params = new URLSearchParams({ company, month, ...(studio ? { studio } : {}) });
        axios.get(api(`closures/?${params}`), auth()).then(({ data: result }) => { if (live) setData(result); }).catch(() => { if (live) setError(t("finance.workspace.error")); }).finally(() => { if (live) setBusy(false); });
        return () => { live = false; };
    }, [company, month, studio, refresh, allowed, setError, t]);
    const refreshChecks = async () => {
        const params = new URLSearchParams({ company, month, ...(studio ? { studio } : {}) });
        const { data: result } = await axios.get(api(`closures/?${params}`), auth());
        setData(result); setMethod((old) => old ? result.methods.find((row) => row.channel === old.channel) : null); setChecking(null);
    };
    const [selectedYear, selectedMonth] = month.split("-").map(Number);
    const years = Array.from({ length: 16 }, (_, i) => selectedYear - 10 + i).filter((year) => year >= 1 && year <= 9999);
    const monthNames = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(language, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, i, 1))));
    const shiftMonth = (delta) => {
        const index = selectedYear * 12 + selectedMonth - 1 + delta;
        setMonth(`${String(Math.floor(index / 12)).padStart(4, "0")}-${String(index % 12 + 1).padStart(2, "0")}`);
    };
    const channel = (key) => t(`finance.receipts.channel.${key}`);
    return <WorkspaceFrame title={w("closures")} current="closures" company={company}>
        {!allowed ? <Alert severity="warning">{w("denied")}</Alert> : <>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                <TextField select label={w("company")} value={company} sx={{ minWidth: 260 }} onChange={(e) => { setCompany(String(e.target.value)); setStudio(""); }}><MenuItem value="">{w("choose")}</MenuItem>{options.companies.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} · {c.currency}</MenuItem>)}</TextField>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <IconButton aria-label={w("closure_previousMonth")} title={w("closure_previousMonth")} disabled={month === "0001-01"} onClick={() => shiftMonth(-1)}><ChevronLeftIcon /></IconButton>
                    <TextField select label={w("closure_month")} value={selectedMonth} sx={{ minWidth: 140 }} onChange={(e) => setMonth(`${String(selectedYear).padStart(4, "0")}-${String(e.target.value).padStart(2, "0")}`)}>{monthNames.map((name, i) => <MenuItem key={i} value={i + 1}>{name}</MenuItem>)}</TextField>
                    <TextField select label={w("closure_year")} value={selectedYear} sx={{ minWidth: 100 }} onChange={(e) => setMonth(`${String(e.target.value).padStart(4, "0")}-${String(selectedMonth).padStart(2, "0")}`)}>{years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}</TextField>
                    <IconButton aria-label={w("closure_nextMonth")} title={w("closure_nextMonth")} disabled={month === "9999-12"} onClick={() => shiftMonth(1)}><ChevronRightIcon /></IconButton>
                </Stack>
                <TextField select SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} label={w("studio")} value={studio} sx={{ minWidth: 230 }} onChange={(e) => setStudio(e.target.value)}><MenuItem value="">{w("all")}</MenuItem>{options.studios.filter((s) => s.site_id === selected?.site).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>
                <Button disabled={busy || !company} onClick={() => setRefresh((v) => v + 1)}>{w("closure_refresh")}</Button>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}{(loading || busy) && <CircularProgress />}
            {!company && <Typography>{w("selectHelp")}</Typography>}
            {data && !data.supported && <Alert severity="info">{w("closure_spain")}</Alert>}
            {data?.supported && <>
                <Typography variant="body2">{w("closure_help")} · {data.currency}</Typography>
                <TableContainer component={Paper} variant="outlined"><Table><TableHead><TableRow>{["channel", "closure_expected", "closure_actual", "closure_difference", "closure_details"].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>{data.methods.map((row) => <TableRow hover key={row.channel}><TableCell><Button onClick={() => setMethod(row)}>{channel(row.channel)}</Button></TableCell>{[row.expected, row.actual].map((value, i) => <TableCell sx={{ whiteSpace: "nowrap" }} key={i}>{money(value)}</TableCell>)}<TableCell sx={{ color: differenceColor(row.difference), whiteSpace: "nowrap" }}>{money(row.difference)}</TableCell><TableCell><Button onClick={() => setMethod(row)}>{w("closure_daily")}</Button>{row.checked_days > 0 && <Typography variant="caption" display="block">{row.checked_days} · {w("check_checked")}</Typography>}{row.recheck_days > 0 && <Typography variant="caption" display="block" color="warning.main">{row.recheck_days} · {w("check_needs_recheck")}</Typography>}{row.review > 0 && <Typography variant="caption" display="block">{row.review} · {w("review")}</Typography>}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
                <Typography variant="caption">{w("closure_provisional")}</Typography>
                {Object.keys(data.issues).length > 0 && <Stack spacing={1}><Typography variant="subtitle2">{w("closure_reviewTitle")}</Typography><Stack direction="row" gap={1} useFlexGap flexWrap="wrap">{Object.entries(data.issues).map(([key, count]) => <Chip key={key} variant="outlined" label={`${w(`closure_issue_${key}`)}: ${count}`} />)}</Stack><Button sx={{ alignSelf: "flex-start" }} onClick={() => setEvidence({ side: "review" })}>{w("closure_reviewRecords")}</Button></Stack>}
                {Object.keys(data.excluded).length > 0 && <Stack direction="row" gap={1} useFlexGap flexWrap="wrap" alignItems="center"><Typography variant="body2">{w("closure_exclusions")}</Typography>{Object.entries(data.excluded).map(([key, count]) => <Chip size="small" key={key} label={`${w(`closure_excluded_${key}`)}: ${count}`} />)}<Button onClick={() => setEvidence({ side: "excluded" })}>{w("open")}</Button></Stack>}
            </>}
        </>}
        <Dialog open={Boolean(method) && allowed} onClose={() => setMethod(null)} fullWidth maxWidth="lg"><DialogTitle>{method && channel(method.channel)} · {month} · {data?.currency}</DialogTitle><DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>{w("closure_dailyHelp")}</Typography>
            <TableContainer sx={{ maxHeight: "60vh" }}><Table stickyHeader size="small"><TableHead><TableRow>{["date", "closure_gross", "closure_fees", "closure_expected", "closure_actual", "closure_difference", ...(!studio ? ["closure_check"] : [])].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>{method?.days.map((day) => <TableRow hover key={day.date}><TableCell><Button size="small" sx={{ whiteSpace: "nowrap" }} onClick={() => setEvidence({ channel: method.channel, day: day.date })}>{day.date}</Button></TableCell>{[day.gross, day.fees, day.expected, day.actual].map((value, i) => <TableCell sx={{ whiteSpace: "nowrap" }} key={i}>{money(value)}</TableCell>)}<TableCell sx={{ color: differenceColor(day.difference) }}>{money(day.difference)}</TableCell>{!studio && <TableCell><Button size="small" onClick={() => setChecking({ channel: method.channel, day })}>{w(`check_${day.check?.status || "open"}`)}</Button></TableCell>}</TableRow>)}{method && <TableRow sx={{ "& td": { fontWeight: "bold" } }}><TableCell>{w("closure_monthTotal")}</TableCell>{[method.gross, method.fees, method.expected, method.actual, method.difference].map((value, i) => <TableCell key={i}>{money(value)}</TableCell>)}{!studio && <TableCell />}</TableRow>}</TableBody></Table></TableContainer>
        </DialogContent><DialogActions><Button onClick={() => setMethod(null)}>{w("close")}</Button></DialogActions></Dialog>
        {allowed && checking && <ClosureCheckDialog key={`${checking.day.date}-${checking.channel}-${checking.day.check?.revision}`} selected={checking} company={company} canCheck={Boolean(data?.can_check)} close={() => setChecking(null)} done={refreshChecks} />}
        {allowed && evidence && <Evidence key={JSON.stringify(evidence)} selected={evidence} close={() => setEvidence(null)} company={company} month={month} studio={studio} w={w} t={t} />}
    </WorkspaceFrame>;
}

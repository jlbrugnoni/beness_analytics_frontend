import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";

// A derived view of the saved workbook. Loading this panel never posts payments.
export default function WorkbookPayments({ batch }) {
    const { t } = useI18n();
    const label = (key) => t(`finance.payments.${key}`);
    const [opened, setOpened] = useState(false);
    const [scope, setScope] = useState("selected");
    const [review, setReview] = useState("all");
    const [search, setSearch] = useState("");
    const [invoice, setInvoice] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [detail, setDetail] = useState(null);
    useEffect(() => {
        let active = true;
        setData(null); setError(""); setDetail(null);
        if (!opened) return undefined;
        setPending(true);
        const params = { scope, review, invoice, page };
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/migration-imports/${batch.id}/payments/`, {
            params, headers: { Authorization: `Token ${sessionStorage.getItem("token")}` },
        }).then(({ data: response }) => { if (active) setData(response); })
            .catch(() => { if (active) setError(t("finance.payments.error")); })
            .finally(() => { if (active) setPending(false); });
        return () => { active = false; };
    }, [batch.id, opened, scope, review, invoice, page, t]);
    const issue = (entry) => `${label(`issue.${entry.code}`)} (${label(entry.field)})`;
    const value = (entry) => typeof entry === "boolean" ? label(entry ? "yes" : "no") : entry === "" ? label("empty") : entry ?? "—";
    const summary = data?.filtered_summary;
    return <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
        <Typography component="h3" variant="h6">{label("title")}</Typography>
        <Typography>{label("help")}</Typography>
        {!opened ? <Button variant="outlined" onClick={() => setOpened(true)}>{label("open")}</Button> : <>
            <Alert severity="info">{label("previewOnly")}</Alert>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField select label={label("scope")} value={scope} onChange={(event) => { setScope(event.target.value); setPage(1); }} sx={{ minWidth: 220 }}>{["selected", "all"].map((key) => <MenuItem key={key} value={key}>{label(key)}{key === "selected" ? ` (${batch.selected_month.slice(0, 7)})` : ""}</MenuItem>)}</TextField>
                <TextField select label={label("review")} value={review} onChange={(event) => { setReview(event.target.value); setPage(1); }} sx={{ minWidth: 180 }}>{["all", "issues"].map((key) => <MenuItem key={key} value={key}>{label(key === "all" ? "allReview" : key)}</MenuItem>)}</TextField>
            </Stack>
            <Box component="form" onSubmit={(event) => { event.preventDefault(); setInvoice(search.trim().toUpperCase()); setPage(1); }}><Stack direction="row" spacing={2} useFlexGap flexWrap="wrap"><TextField label={label("search")} value={search} onChange={(event) => setSearch(event.target.value)} inputProps={{ maxLength: 11, pattern: "[Bb]0[12][0-9]{8}" }} helperText={label("searchHelp")} /><Button type="submit" disabled={pending}>{label("filter")}</Button><Button disabled={pending || (!invoice && !search)} onClick={() => { setSearch(""); setInvoice(""); setPage(1); }}>{label("clear")}</Button></Stack></Box>
            {error && <Alert severity="error">{error}</Alert>}
            {pending && <CircularProgress />}
            {data && <>
                {data.file_issues.map((code) => <Alert severity="warning" key={code}>{t(`finance.migration.fileIssue.${code}`, label("unsupportedFile"))}</Alert>)}
                <Typography>{label("dates")}: {data.summary.first_date || "—"} – {data.summary.last_date || "—"} · {label("allRows")}: {data.summary.rows}</Typography>
                <Typography>{label("filtered")}: {summary.rows} · {label("sourceTotal")}: {summary.amount_total} DOP · {label("issues")}: {summary.review_rows} · {label("missingNumbers")}: {summary.missing_numbers}</Typography>
                <Typography variant="body2">{label("totalsHelp")}</Typography>
                {!data.count ? <Typography>{label("noRows")}</Typography> : <TableContainer><Table size="small"><TableHead><TableRow>{["source_row", "date", "number", "invoice_code", "amount", "original_method", "method", "location", "invoiceGroup", "issues", "source"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead><TableBody>{data.results.map((row) => <TableRow key={row.source_row}>
                    <TableCell>{row.source_row}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.date || "—"}</TableCell><TableCell>{row.number || "—"}</TableCell><TableCell sx={{ whiteSpace: "nowrap" }}>{row.invoice_code || "—"}</TableCell><TableCell>{row.amount ?? "—"}</TableCell><TableCell>{row.original_method || "—"}</TableCell><TableCell>{row.method || "—"}</TableCell><TableCell>{row.location || "—"}</TableCell><TableCell>{row.invoice_code ? `${row.invoice_payment_rows} / ${row.invoice_payment_total}` : "—"}</TableCell><TableCell sx={{ minWidth: 240 }}>{row.issues.length ? row.issues.map((entry, index) => <Typography variant="body2" key={index}>{issue(entry)}</Typography>) : label("noIssues")}</TableCell><TableCell><Button onClick={() => setDetail(row)}>{label("source")}</Button></TableCell>
                </TableRow>)}</TableBody></Table></TableContainer>}
                <Stack direction="row" spacing={2} alignItems="center"><Button disabled={pending || !data.previous} onClick={() => setPage((old) => old - 1)}>{label("previous")}</Button><Typography>{label("page")} {page} · {data.count}</Typography><Button disabled={pending || !data.next} onClick={() => setPage((old) => old + 1)}>{label("next")}</Button></Stack>
            </>}
        </>}
    </Stack><Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="lg"><DialogTitle>{label("source")} · {detail?.sheet}!{detail?.source_row}</DialogTitle><DialogContent>{detail && <Stack spacing={2}>
        <Alert severity="info">{label("referenceOnly")}</Alert>
        {["number", "invoice_code", "associations", "date", "amount", "account", "original_method", "method", "location", "status", "source_reviewed", "manual_reviewed"].map((key) => <Typography key={key}>{label(key)}: {value(detail[key])}</Typography>)}
        {detail.issues.map((entry, index) => <Alert severity="warning" key={index}>{issue(entry)}</Alert>)}
        <TableContainer><Table size="small"><TableHead><TableRow>{["cell", "column", "value", "formula", "issues"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead><TableBody>{detail.cells.map((cell) => <TableRow key={cell.cell}><TableCell>{cell.cell}</TableCell><TableCell>{cell.column_label}</TableCell><TableCell sx={{ overflowWrap: "anywhere" }}>{value(cell.readable_value)}</TableCell><TableCell sx={{ overflowWrap: "anywhere" }}>{cell.formula || "—"}</TableCell><TableCell>{cell.issue ? label(`issue.${cell.issue}`) : "—"}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        <Box component="details"><Box component="summary">{label("originalCells")}</Box><Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(detail.cells, null, 2)}</Typography></Box>
    </Stack>}</DialogContent><DialogActions><Button onClick={() => setDetail(null)}>{label("close")}</Button></DialogActions></Dialog></Paper>;
}

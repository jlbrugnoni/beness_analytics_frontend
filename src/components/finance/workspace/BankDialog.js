import { formatMoney } from "@/utils/formatMoney";
import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { api, auth, empty, Pages, SourceDialog } from "./common";

export default function BankDialog({ record, close, canEdit, changed, w, t }) {
    const [data, setData] = useState(null); const [options, setOptions] = useState({ categories: [], studios: [], channels: [], terminals: [], kinds: [] });
    const [edit, setEdit] = useState({}); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
    const [error, setError] = useState(""); const [saved, setSaved] = useState(false); const [source, setSource] = useState(false);
    const [events, setEvents] = useState(empty); const [historyPage, setHistoryPage] = useState(1); const [refresh, setRefresh] = useState(0);
    useEffect(() => { let active = true; setData(null); setEdit({}); setNote(""); setError(""); setSaved(false); setSource(false); setHistoryPage(1);
        if (!record) return undefined; setLoading(true);
        Promise.all([axios.get(api(`bank-movements/${record.id}/`), auth()), axios.get(api(`bank-movements/${record.id}/options/`), auth())]).then(([detail, choices]) => { if (!active) return; setData(detail.data); setOptions(choices.data); setEdit(detail.data.classification || {}); }).catch(() => { if (active) setError(t("finance.workspace.error")); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [record, t]);
    useEffect(() => { let active = true; setEvents(empty);
        if (record) axios.get(api(`bank-movements/${record.id}/history/?page=${historyPage}`), auth()).then(({ data: result }) => { if (active) setEvents(result); }).catch(() => { if (active) setError(t("finance.workspace.error")); });
        return () => { active = false; };
    }, [record, historyPage, refresh, t]);
    const change = (key, value) => { setSaved(false); setEdit((old) => ({ ...old, [key]: value })); };
    const allowed = canEdit && data?.can_edit && data?.active && !data?.reconciled;
    const debit = data?.source.direction === "debit";
    const kind = edit.movement_kind || "";
    const expense = debit && kind === "expense";
    const receipt = !debit && kind === "customer_receipt";
    const hasChildren = options.categories.some((c) => c.parent === edit.category && c.active);
    const validMonth = !edit.expense_period || /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(edit.expense_period.slice(0, 7));
    const date = edit.operation_date || "";
    const parsedDate = date ? new Date(`${date}T00:00:00Z`) : null;
    const validDate = !date || (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date);
    const missing = [!kind && "movement_kind", kind !== "internal_transfer" && !edit.studio && !edit.administration && "studio",
        expense && !edit.category && "category", expense && edit.category && hasChildren && !edit.subcategory && "subcategory",
        expense && !edit.expense_period && "expense_period", receipt && !edit.channel && "channel", receipt && !date && "operation_date"].filter(Boolean);
    const incomplete = missing.length > 0 || !validDate || !validMonth;
    useEffect(() => { if (incomplete && edit.reviewed) setEdit((old) => ({ ...old, reviewed: false })); }, [incomplete, edit.reviewed]);
    const save = async () => {
        if (!validMonth) { setError(w("badExpensePeriod")); return; }
        if (!validDate) { setError(w("badOperationDate")); return; }
        setBusy(true); setError(""); setSaved(false);
        const values = Object.fromEntries(Object.entries(edit).filter(([key, value]) => value !== (data.classification || {})[key]));
        if (values.expense_period) values.expense_period = values.expense_period.slice(0, 7) + "-01";
        try { const { data: result } = await axios.post(api(`bank-movements/${record.id}/assign/`), { expected_revision: data.revision, note, ...values }, auth()); setData({ ...data, ...result }); setEdit(result.classification); setNote(""); setSaved(true); setRefresh((old) => old + 1); changed(); }
        catch (failure) { const body = failure.response?.data; const messages = body && typeof body === "object" ? Object.entries(body).map(([key, value]) => `${key === "detail" || key === "non_field_errors" ? "" : `${w(key)}: `}${Array.isArray(value) ? value.join(" ") : value}`).join("\n") : ""; setError(failure.response?.status === 409 ? w("stale") : messages || w("error")); }
        finally { setBusy(false); }
    };
    const dirty = Object.entries(edit).some(([key, value]) => value !== (data?.classification || {})[key]);
    const main = options.categories.filter((c) => !c.parent && (c.active || c.id === edit.category));
    const sub = options.categories.filter((c) => c.parent === edit.category && (c.active || c.id === edit.subcategory));
    const selection = (key, choices, value = edit[key] ?? "", onChange = null, helperText = null) => <TextField required={missing.includes(key)} error={missing.includes(key)} helperText={missing.includes(key) ? w("requiredField") : helperText} select fullWidth SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} label={w(key)} value={value} disabled={!allowed || busy} onChange={onChange || ((event) => change(key, event.target.value || null))}>{key !== "movement_kind" && <MenuItem value="">{w("unknown")}</MenuItem>}{choices.map((choice) => <MenuItem key={choice.id ?? choice.value} value={choice.id ?? choice.value}>{choice.name ?? choice.label}{choice.active === false ? ` (${w("inactive")})` : ""}</MenuItem>)}</TextField>;
    const label = (values) => {
        if (!values || !Object.keys(values).length) return w("unclassified");
        return [values.description, options.categories.find((c) => c.id === values.category)?.name, options.categories.find((c) => c.id === values.subcategory)?.name,
            values.administration ? w("administration") : options.studios.find((s) => s.id === values.studio)?.name,
            values.channel ? t(`finance.receipts.channel.${values.channel}`, values.channel) : null, values.expense_period || values.operation_date,
            values.movement_kind ? w(`kind_${values.movement_kind}`) : null, `${w("reviewed")}: ${w(values.reviewed ? "yes" : "no")}`].filter(Boolean).join(" · ");
    };
    return <><Dialog open={Boolean(record)} onClose={() => { if (!busy) close(); }} fullWidth maxWidth="lg"><DialogTitle>{w(debit ? "editDebit" : "editCredit")}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error" sx={{ whiteSpace: "pre-wrap" }}>{error}</Alert>}{saved && <Alert severity="success">{w("saved")}</Alert>}
        {loading ? <CircularProgress /> : data && <>
            <Stack direction="row" alignItems="center" gap={1}><Typography sx={{ flex: 1 }}>{data.source.bank_date} · {formatMoney(data.source.amount)} {data.source.currency} · {data.source.description}</Typography><Tooltip title={w("original")}><IconButton aria-label={w("original")} onClick={() => setSource(true)} size="small"><InfoOutlinedIcon fontSize="small" /></IconButton></Tooltip></Stack><Typography variant="body2">{data.file_name}</Typography>
            {data.reconciled && <Alert severity="warning">{w("reconciledLocked")}</Alert>}
            <TextField label={w("business_description")} value={edit.description || ""} onChange={(event) => change("description", event.target.value)} disabled={!allowed || busy} multiline minRows={2} inputProps={{ maxLength: 2000 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                {selection("movement_kind", options.kinds.map((k) => ({ ...k, label: w(k.value === "refund" && debit ? "kind_debit_refund" : `kind_${k.value}`) })), edit.movement_kind || "", (event) => change("movement_kind", event.target.value), w(`kindHelp_${edit.movement_kind || "unknown"}`))}
                {debit && selection("category", main, edit.category || "", (event) => { setSaved(false); setEdit({ ...edit, category: event.target.value || null, subcategory: null }); })}
                {debit && selection("subcategory", sub)}
                {selection("studio", [{ id: "administration", name: w("administration") }, ...options.studios], edit.administration ? "administration" : edit.studio || "", (event) => { setSaved(false); setEdit({ ...edit, studio: event.target.value === "administration" ? null : event.target.value || null, administration: event.target.value === "administration", terminal: null }); })}
                {selection("channel", options.channels.map((c) => ({ ...c, label: t(`finance.receipts.channel.${c.value}`, c.label) })), edit.channel || "", (event) => { setSaved(false); setEdit({ ...edit, channel: event.target.value, terminal: null }); })}
                {selection("terminal", options.terminals.map((c) => ({ ...c, name: `${c.identifier} · ${options.studios.find((s) => s.id === c.studio_id)?.name || ""}` })), edit.terminal || "", (event) => { const terminal = options.terminals.find((item) => item.id === event.target.value); setSaved(false); setEdit({ ...edit, terminal: terminal?.id || null, ...(terminal ? { studio: terminal.studio_id, administration: false, channel: terminal.channel } : {}) }); })}
                {debit ? <TextField label={w("expense_period")} required={missing.includes("expense_period")} error={missing.includes("expense_period") || !validMonth} placeholder="YYYY-MM" helperText={!validMonth ? w("badExpensePeriod") : missing.includes("expense_period") ? w("requiredField") : w("periodFormat")} inputProps={{ maxLength: 7 }} InputLabelProps={{ shrink: true }} value={edit.expense_period?.slice(0, 7) || ""} disabled={!allowed || busy} onChange={(event) => change("expense_period", event.target.value || null)} /> : <TextField label={w("operation_date")} required={missing.includes("operation_date")} error={missing.includes("operation_date") || !validDate} placeholder="YYYY-MM-DD" helperText={!validDate ? w("badOperationDate") : missing.includes("operation_date") ? w("requiredField") : w("dateFormat")} inputProps={{ maxLength: 10 }} InputLabelProps={{ shrink: true }} value={edit.operation_date || ""} disabled={!allowed || busy} onChange={(event) => change("operation_date", event.target.value || null)} />}
            </Box>
            <Typography variant="body2">{w("terminalHelp")}</Typography>
            <FormControlLabel control={<Checkbox checked={Boolean(edit.reviewed) && !incomplete} disabled={!allowed || busy || incomplete} onChange={(event) => change("reviewed", event.target.checked)} />} label={w("recognized")} />
            <Typography variant="body2">{w(incomplete ? "reviewCompleteFirst" : "reviewedHelp")}</Typography>
            {allowed && <TextField label={w("bankComment")} value={note} disabled={busy} onChange={(event) => setNote(event.target.value)} inputProps={{ maxLength: 2000 }} multiline />}
            <Divider /><Box component="details"><Box component="summary" sx={{ cursor: "pointer" }}>{w("audit")}</Box><Stack spacing={1} sx={{ mt: 1 }}>{events.results.map((entry) => <Paper variant="outlined" sx={{ p: 2 }} key={entry.id}><Typography>{new Date(entry.created_at).toLocaleString()} · {entry.note || (entry.action === "classify" ? w("classificationUpdated") : entry.action)}</Typography>{entry.action === "classify" && <><Typography variant="body2">{w("before")}: {label(entry.before.classification)}</Typography><Typography variant="body2">{w("after")}: {label(entry.after.classification)}</Typography></>}</Paper>)}<Pages data={events} page={historyPage} setPage={setHistoryPage} busy={busy} w={w} /></Stack></Box>
        </>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{w("close")}</Button>{allowed && <Button variant="contained" disabled={busy || !dirty} onClick={save}>{w("save")}</Button>}</DialogActions></Dialog>
        <SourceDialog data={source && data ? { source: data.source, file_name: data.file_name, href: `/finance/imports?batch=${data.batch}` } : null} close={() => setSource(false)} w={w} />
    </>;
}

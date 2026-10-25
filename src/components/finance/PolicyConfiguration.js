import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControlLabel, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";

const channels = ["card_terminal", "recurring", "payment_link", "transfer", "cash", "other"];
const sections = ["fee-policies", "settlement-policies", "tax-profiles"];
const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}/`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const dates = ["valid_from", "valid_until", "reimbursement_from", "reimbursement_until"];
const numbers = ["percentage", "separate_fee_amount", "rate"];
const defaults = { channel: "card_terminal", valid_from: "", valid_until: "", notes: "", active: true,
    deposit_mode: "unknown", percentage: "", separate_fee_amount: "", separate_fee_frequency: "unknown",
    reimbursement_expected: false, reimbursement_from: "", reimbursement_until: "", minimum_hours: 24, maximum_hours: 48,
    weekend_delays: false, treatment: "unknown", rate: "" };
const fields = {
    "fee-policies": ["channel", "deposit_mode", "percentage", "separate_fee_amount", "separate_fee_frequency", "reimbursement_expected", "reimbursement_from", "reimbursement_until"],
    "settlement-policies": ["channel", "minimum_hours", "maximum_hours", "weekend_delays"],
    "tax-profiles": ["treatment", "rate"],
};

export default function PolicyConfiguration({ companies, sites, onCompanyUpdated, onReload }) {
    const { t } = useI18n();
    const [companyId, setCompanyId] = useState(companies[0]?.id || "");
    const [section, setSection] = useState(sections[0]);
    const company = companies.find((item) => item.id === Number(companyId));
    const canWrite = Boolean(company?.active && sites.some((site) => site.id === company.site));
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState(null);
    const [setup, setSetup] = useState(false);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [conflict, setConflict] = useState(false);
    const [preview, setPreview] = useState({ date: new Date().toLocaleDateString("en-CA"), channel: "card_terminal", amount: "100.00" });
    const [result, setResult] = useState(null);
    const version = useRef(0);
    const label = (key) => t(`finance.policy.${key}`);
    const channelLabel = (key) => t(`finance.mapping.channel.${key}`);
    const unknown = t("finance.config.unknown");
    const errorText = (err) => err.response?.status === 409 ? t("finance.config.conflict") :
        (typeof err.response?.data === "object" ? Object.entries(err.response.data).map(([key, value]) =>
            `${["__all__", "non_field_errors", "detail"].includes(key) ? "" : `${t(`finance.policy.${key}`, key)}: `}${Array.isArray(value) ? value.join(" ") : String(value)}`).join("\n") : t("finance.config.error"));
    const load = useCallback(async () => {
        const current = ++version.current;
        setLoading(true); setFailed(false); setRows([]); setResult(null);
        if (!companyId) { setLoading(false); return; }
        try {
            let next = `${api(section)}?company=${companyId}`; const all = [];
            while (next) { const response = await axios.get(next, auth()); all.push(...response.data.results); next = response.data.next; }
            if (current === version.current) setRows(all);
        } catch { if (current === version.current) setFailed(true); }
        finally { if (current === version.current) setLoading(false); }
    }, [companyId, section]);
    useEffect(() => { load(); return () => { version.current += 1; }; }, [load]);
    const open = (row) => { setForm(row ? { ...row } : { ...defaults, company: company.id }); setError(null); setConflict(false); setFeedback(null); };
    const change = (key, value) => setForm((old) => ({ ...old, [key]: value,
        ...(key === "deposit_mode" && value !== "net" ? { percentage: "" } : {}),
        ...(key === "treatment" && value !== "inclusive" ? { rate: "" } : {}),
        ...(key === "reimbursement_expected" && !value ? { reimbursement_from: "", reimbursement_until: "" } : {}),
    }));
    const save = async (event) => {
        event.preventDefault(); setBusy(true); setError(null);
        try {
            if (setup) {
                const response = await axios.post(api("policy-setup"), { company: company.id, expected_revision: company.revision }, auth());
                onCompanyUpdated(response.data.company); setSetup(false); setFeedback(label("initialized"));
            } else {
                const payload = Object.fromEntries(["company", "valid_from", "valid_until", "notes", "active", ...fields[section]].map((key) =>
                    [key, [...dates, ...numbers].includes(key) ? (form[key] === "" || form[key] == null ? null : form[key]) : form[key]]));
                if (form.id) payload.expected_revision = form.revision;
                await axios[form.id ? "patch" : "post"](api(`${section}${form.id ? `/${form.id}` : ""}`), payload, auth());
                setForm(null); setFeedback(t("finance.config.saved"));
            }
            await load();
        } catch (err) { setConflict(err.response?.status === 409); setError(errorText(err)); }
        finally { setBusy(false); }
    };
    const text = (key, options = {}) => <TextField fullWidth label={label(key)} value={form?.[key] ?? ""} onChange={(event) => change(key, event.target.value)} {...options} />;
    const select = (key, choices, options = {}) => <TextField select fullWidth label={label(key)} value={form?.[key] ?? ""} onChange={(event) => change(key, event.target.value)} {...options}>
        {choices.map((value) => <MenuItem key={value} value={value}>{key === "channel" ? channelLabel(value) : label(`${key}.${value}`)}</MenuItem>)}</TextField>;
    const check = (key) => <FormControlLabel label={label(key)} control={<Switch checked={Boolean(form?.[key])} onChange={(_, checked) => change(key, checked)} />} />;
    const date = (key) => text(key, { type: "date", InputLabelProps: { shrink: true } });
    const numeric = (key, step = "0.0001") => text(key, { type: "number", inputProps: { min: 0, step } });
    return <Stack spacing={2}>
        <Alert severity="info">{label("intro")}</Alert>
        <TextField select label={t("finance.config.company")} value={companyId} disabled={busy} onChange={(event) => {
            setCompanyId(event.target.value); setError(null); setFeedback(null); setResult(null);
        }}>{companies.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.default_currency}</MenuItem>)}</TextField>
        {!canWrite && <Alert severity="info">{label("scope")}</Alert>}
        {feedback && <Alert severity="success">{feedback}</Alert>}
        {!form && !setup && error && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{error}</Alert>}
        {canWrite && ["DO", "ES"].includes(company.country_code) && <Button variant="outlined" onClick={() => { setSetup(true); setError(null); setConflict(false); }}>{label("initialize")}</Button>}
        <Tabs value={section} onChange={(_, value) => { setSection(value); setError(null); setFeedback(null); }} variant="scrollable" scrollButtons="auto">
            {sections.map((key) => <Tab key={key} value={key} label={label(key)} />)}
        </Tabs>
        <Alert severity="info">{label("datesHelp")}</Alert>
        <Button variant="contained" sx={{ alignSelf: "flex-start" }} disabled={!canWrite || failed || loading} onClick={() => open(null)}>{label("add")}</Button>
        {loading ? <CircularProgress /> : failed ? <Alert severity="error">{t("finance.config.error")} <Button onClick={load}>{t("access.reload")}</Button></Alert> : !rows.length ? <Typography>{t("finance.config.empty")}</Typography> : rows.map((row) => <Paper variant="outlined" key={row.id} sx={{ p: 2 }}>
            <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6">{section === "tax-profiles" ? label(`treatment.${row.treatment}`) : channelLabel(row.channel)}</Typography>
                    <Button disabled={!canWrite} onClick={() => open(row)}>{t("finance.config.edit")}</Button></Stack>
                <Typography>{row.valid_from || label("baseline")} → {row.valid_until || label("openEnd")}</Typography>
                {section === "fee-policies" && <>
                    <Typography>{label(`deposit_mode.${row.deposit_mode}`)}{row.deposit_mode === "net" && ` · ${label("percentage")}: ${row.percentage == null ? unknown : `${row.percentage}%`}`}</Typography>
                    <Typography>{label("separate_fee_amount")}: {row.separate_fee_amount == null ? unknown : `${row.separate_fee_amount} ${company?.default_currency} · ${label(`separate_fee_frequency.${row.separate_fee_frequency}`)}`}</Typography>
                    {row.reimbursement_expected && <Typography>{label("reimbursement_expected")} · {row.reimbursement_from || unknown} → {row.reimbursement_until || unknown}</Typography>}
                </>}
                {section === "settlement-policies" && <Typography>{row.minimum_hours}–{row.maximum_hours} {label("hours")} · {label(row.weekend_delays ? "weekendsYes" : "weekendsNo")}</Typography>}
                {section === "tax-profiles" && row.rate != null && <Typography>{row.rate}%</Typography>}
                {row.notes && <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{row.notes}</Typography>}
                <Chip size="small" sx={{ alignSelf: "flex-start" }} label={t(row.active ? "finance.config.active" : "finance.config.inactive")} />
            </Stack>
        </Paper>)}
        {canWrite && <Paper variant="outlined" sx={{ p: 2 }}><Stack component="form" spacing={2} onSubmit={async (event) => {
            event.preventDefault(); setBusy(true); setResult(null); setError(null);
            try { const response = await axios.post(api("policy-preview"), { company: company.id, ...preview }, auth()); setResult(response.data); }
            catch (err) { setError(errorText(err)); } finally { setBusy(false); }
        }}>
            <Typography variant="h6">{label("preview")}</Typography><Typography>{label("previewHelp")}</Typography>
            <TextField required type="date" label={label("date")} InputLabelProps={{ shrink: true }} value={preview.date} onChange={(event) => { setPreview({ ...preview, date: event.target.value }); setResult(null); }} />
            <TextField select label={label("channel")} value={preview.channel} onChange={(event) => { setPreview({ ...preview, channel: event.target.value }); setResult(null); }}>{channels.map((key) => <MenuItem key={key} value={key}>{channelLabel(key)}</MenuItem>)}</TextField>
            <TextField required type="number" inputProps={{ min: 0, step: "0.01" }} label={`${label("amount")} (${company.default_currency})`} value={preview.amount} onChange={(event) => { setPreview({ ...preview, amount: event.target.value }); setResult(null); }} />
            <Button type="submit" variant="outlined" disabled={busy}>{label("run")}</Button>
            {result && <Stack spacing={1} role="status">
                <Alert severity={result.requires_review ? "warning" : "info"}>{label(result.requires_review ? "incomplete" : "previewOnly")}</Alert>
                {["estimated_withheld_fee", "estimated_deposit", "included_tax", "separate_fee_amount"].map((key) => <Typography key={key}>{label(key)}: {result[key] == null ? unknown : `${result[key]} ${result.currency}`}</Typography>)}
                <Typography>{label("resultInclusive")}</Typography>
                <Typography>{result.settlement ? `${result.settlement.minimum_hours}–${result.settlement.maximum_hours} ${label("hours")} · ${label(result.settlement.weekend_delays ? "weekendsYes" : "weekendsNo")}` : label("timingUnknown")}</Typography>
            </Stack>}
        </Stack></Paper>}
        <Dialog open={Boolean(form) || setup} onClose={() => { if (!busy) { setForm(null); setSetup(false); } }} fullWidth maxWidth="sm"><Box component="form" onSubmit={save}>
            <DialogTitle>{setup ? label("initialize") : label(form?.id ? "edit" : "add")}</DialogTitle>
            <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                {error && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{error}</Alert>}
                {setup ? <Alert severity="info">{label(company?.country_code === "DO" ? "setupDO" : "setupES")}</Alert> : <Box component="fieldset" disabled={busy || conflict} sx={{ border: 0, p: 0, m: 0 }}><Stack spacing={2}>
                    {section !== "tax-profiles" && select("channel", channels, { disabled: Boolean(form?.id) })}
                    {date("valid_from")}{date("valid_until")}
                    {section === "fee-policies" && <>
                        {select("deposit_mode", ["unknown", "full", "net"])}
                        {form?.deposit_mode === "net" && numeric("percentage")}
                        <Typography variant="body2">{label("unknownHelp")}</Typography>
                        {numeric("separate_fee_amount", "0.01")}{select("separate_fee_frequency", ["unknown", "monthly", "per_transaction", "per_settlement"])}
                        {check("reimbursement_expected")}
                        {form?.reimbursement_expected && <>{date("reimbursement_from")}{date("reimbursement_until")}</>}
                    </>}
                    {section === "settlement-policies" && <>{numeric("minimum_hours", "1")}{numeric("maximum_hours", "1")}{check("weekend_delays")}<Alert severity="info">{label("timingHelp")}</Alert></>}
                    {section === "tax-profiles" && <>{select("treatment", ["unknown", "inclusive", "no_tax", "exempt"])}{form?.treatment === "inclusive" && numeric("rate")}<Alert severity="info">{label("taxHelp")}</Alert></>}
                    {text("notes", { multiline: true, minRows: 2, inputProps: { maxLength: 2000 } })}{check("active")}
                </Stack></Box>}
            </Stack></DialogContent>
            <DialogActions><Button disabled={busy} onClick={() => { setForm(null); setSetup(false); }}>{t("finance.config.cancel")}</Button>
                {conflict && <Button disabled={busy} onClick={() => { setForm(null); setSetup(false); onReload(); }}>{t("access.reload")}</Button>}
                <Button type="submit" variant="contained" disabled={busy || conflict}>{busy ? <CircularProgress size={20} /> : t("finance.config.save")}</Button></DialogActions>
        </Box></Dialog>
    </Stack>;
}

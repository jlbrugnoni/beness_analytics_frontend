import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Chip, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useI18n from "@/hooks/useI18n";

const fields = ["alegra_cost_center", "alegra_price_list", "alegra_payment_method", "mindbody_payment_method", "mindbody_studio", "historical_payment_method", "historical_studio"];
const channels = ["card_terminal", "recurring", "payment_link", "transfer", "cash", "other"];
const studioLabels = ["Bella Vista", "Piantini", "Arroyo Hondo"];
const endpoint = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const headers = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const blankPreview = { source: "alegra", cost_center: "", price_list: "", payment_method: "", studio_label: "", manual_channel: "", manual_studio: "" };
const errorText = (error, t) => {
    if (error.response?.status === 409) return t("finance.config.conflict");
    const details = error.response?.data;
    return typeof details === "object" ? Object.entries(details).map(([key, value]) => {
        const message = Array.isArray(value) ? value.join(" ") : String(value);
        return ["non_field_errors", "detail"].includes(key) ? message : `${t(`finance.mapping.${key}`, t(`finance.config.${key}`, key))}: ${message}`;
    }).join("\n") : t("finance.config.error");
};

export default function SourceMappingConfiguration({ companies, sites, studios, paymentMethods = [], onCompanyUpdated }) {
    const { t } = useI18n();
    const [companyId, setCompanyId] = useState(companies[0]?.id || "");
    const company = companies.find((item) => item.id === Number(companyId));
    const companyWide = sites.some((site) => site.id === company?.site);
    const companyStudios = studios.filter((studio) => studio.site_id === company?.site);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [form, setForm] = useState(null);
    const [setup, setSetup] = useState(null);
    const [formError, setFormError] = useState(null);
    const [conflict, setConflict] = useState(false);
    const [preview, setPreview] = useState(blankPreview);
    const [result, setResult] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const version = useRef(0);
    const load = useCallback(async () => {
        const requestVersion = ++version.current;
        setRows([]); setResult(null); setLoading(true); setFailed(false);
        if (!companyId) { setLoading(false); return; }
        try {
            let next = endpoint(`source-mappings/?company=${companyId}`); const all = [];
            while (next) {
                const response = await axios.get(next, headers()); all.push(...response.data.results); next = response.data.next;
            }
            if (requestVersion === version.current) setRows(all);
        } catch { if (requestVersion === version.current) setFailed(true); }
        finally { if (requestVersion === version.current) setLoading(false); }
    }, [companyId]);
    useEffect(() => { load(); return () => { version.current += 1; }; }, [load]);
    const open = (row = null) => {
        setForm(row ? { ...row } : { company: Number(companyId), source_field: "alegra_payment_method", source_value: "",
            behavior: "map", studio: null, channel: "", requires_review: false, active: true });
        setSetup(null); setFormError(null); setConflict(false); setFeedback(null);
    };
    const changeForm = (key, value) => setForm((old) => ({ ...old, [key]: value,
        ...(key === "source_field" ? { studio: null, channel: "", requires_review: false, behavior: "map" } : {}),
        ...(key === "behavior" && value !== "map" ? { studio: null, channel: "", requires_review: false } : {}),
    }));
    const openSetup = () => {
        setForm(null); setFormError(null); setConflict(false); setFeedback(null);
        setSetup(Object.fromEntries(studioLabels.map((label) => {
            const matches = companyStudios.filter((studio) => [label, `Beness Pilates - ${label}`].includes(studio.name));
            return [label, matches.length === 1 ? matches[0].id : ""];
        })));
    };
    const save = async (event) => {
        event.preventDefault(); setBusy(true); setFormError(null);
        try {
            if (setup) {
                const response = await axios.post(endpoint(`companies/${company.id}/initialize-mappings/`), { studios: setup, expected_revision: company.revision }, headers());
                onCompanyUpdated(response.data.company); setSetup(null); setFeedback(t("finance.mapping.initialized"));
            } else {
                const payload = Object.fromEntries(["company", "source_field", "source_value", "behavior", "studio", "channel", "requires_review", "active"].map((key) => [key, form[key]]));
                if (form.id) payload.expected_revision = form.revision;
                await axios[form.id ? "patch" : "post"](endpoint(`source-mappings/${form.id ? `${form.id}/` : ""}`), payload, headers());
                setForm(null); setFeedback(t("finance.config.saved"));
            }
            await load();
        } catch (error) { setConflict(error.response?.status === 409); setFormError(errorText(error, t)); }
        finally { setBusy(false); }
    };
    const changePreview = (key, value) => { setPreview((old) => key === "source" ? { ...blankPreview, source: value } : { ...old, [key]: value }); setResult(null); setPreviewError(null); };
    const test = async (event) => {
        event.preventDefault(); setBusy(true); setResult(null); setPreviewError(null);
        const payload = { company: Number(companyId), source: preview.source, payment_method: preview.payment_method,
            ...(preview.source === "alegra" ? { cost_center: preview.cost_center, price_list: preview.price_list } : { studio_label: preview.studio_label }),
            ...(preview.manual_channel ? { manual_channel: preview.manual_channel } : {}),
            ...(preview.manual_studio ? { manual_studio: preview.manual_studio } : {}),
        };
        try { const response = await axios.post(endpoint("mapping-preview/"), payload, headers()); setResult(response.data); }
        catch (error) { setPreviewError(errorText(error, t)); }
        finally { setBusy(false); }
    };
    const isPayment = form?.source_field.endsWith("payment_method");
    const sourceOptions = form?.source_field === "mindbody_payment_method" ? paymentMethods.filter((method) => method.site_id === company?.site).map((method) => method.name) : [];
    const previewField = (key) => <TextField label={t(`finance.mapping.${key}`)} value={preview[key]} disabled={busy}
        onChange={(event) => changePreview(key, event.target.value)} inputProps={{ maxLength: 180 }} fullWidth />;
    return <Stack spacing={2}>
        <Alert severity="info">{t("finance.mapping.intro")}</Alert>
        <TextField select label={t("finance.config.company")} value={companyId} disabled={busy} onChange={(event) => {
            setCompanyId(event.target.value); setFeedback(null); setPreview(blankPreview); setPreviewError(null); setResult(null);
        }}>{companies.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
        {company?.country_code === "DO" && <Alert severity="info">{t("finance.mapping.creditHelp")}</Alert>}
        {company?.country_code === "ES" && <Alert severity="info">{t("finance.mapping.spainHelp")}</Alert>}
        {!companyWide && company && <Alert severity="info">{t("finance.mapping.scopeHelp")}</Alert>}
        {feedback && <Alert severity="success">{feedback}</Alert>}
        {failed && <Alert severity="error" action={<Button onClick={load}>{t("access.reload")}</Button>}>{t("finance.config.error")}</Alert>}
        {loading && <CircularProgress size={24} />}
        {!loading && !failed && company && <>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                <Button variant="contained" disabled={busy || !companyWide || !company.active} onClick={() => open()}>{t("finance.mapping.add")}</Button>
                {company.country_code === "DO" && <Button variant="outlined" disabled={busy || !companyWide || !company.active} onClick={openSetup}>{t("finance.mapping.initialize")}</Button>}
            </Stack>
            <Accordion defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>{t("finance.mapping.test")}</Typography></AccordionSummary>
                <AccordionDetails><Box component="form" onSubmit={test}><Stack spacing={2}>
                    <Alert severity="info">{t("finance.mapping.previewHelp")}</Alert>
                    <TextField select label={t("finance.mapping.source")} value={preview.source} disabled={busy} onChange={(event) => changePreview("source", event.target.value)}>
                        {["alegra", "mindbody", "historical"].map((source) => <MenuItem key={source} value={source}>{t(`finance.mapping.source.${source}`)}</MenuItem>)}
                    </TextField>
                    {preview.source === "alegra" ? <>{previewField("cost_center")}{previewField("price_list")}</> : previewField("studio_label")}
                    {previewField("payment_method")}
                    <TextField select label={t("finance.mapping.manual_channel")} value={preview.manual_channel} disabled={busy}
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} onChange={(event) => changePreview("manual_channel", event.target.value)}>
                        <MenuItem value="">{t("finance.mapping.useRules")}</MenuItem>
                        {channels.map((channel) => <MenuItem key={channel} value={channel}>{t(`finance.mapping.channel.${channel}`)}</MenuItem>)}
                    </TextField>
                    <TextField select label={t("finance.mapping.manual_studio")} value={preview.manual_studio} disabled={busy}
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} onChange={(event) => changePreview("manual_studio", event.target.value)}>
                        <MenuItem value="">{t("finance.mapping.useRules")}</MenuItem>
                        {companyStudios.map((studio) => <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>)}
                    </TextField>
                    <Button type="submit" variant="outlined" disabled={busy || !companyWide || !company.active}>{t("finance.mapping.runTest")}</Button>
                    {previewError && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{previewError}</Alert>}
                    {result && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
                        <Alert severity={result.requires_review ? "warning" : "success"}>{t(result.requires_review ? "finance.mapping.needsReview" : "finance.mapping.resolved")}</Alert>
                        <Typography>{t("finance.config.studio")}: {companyStudios.find((studio) => studio.id === result.studio)?.name || t("finance.mapping.unassigned")} ({t(`finance.mapping.origin.${result.studio_origin}`)})</Typography>
                        <Typography>{t("finance.mapping.channel")}: {result.channel ? t(`finance.mapping.channel.${result.channel}`) : t("finance.mapping.unassigned")} ({t(`finance.mapping.origin.${result.channel_origin}`)})</Typography>
                        {result.warnings.map((warning) => <Typography key={warning} variant="body2">{t(`finance.mapping.warning.${warning}`)}</Typography>)}
                    </Stack></Paper>}
                </Stack></Box></AccordionDetails>
            </Accordion>
            {!rows.length && <Typography>{t("finance.config.empty")}</Typography>}
            {rows.map((row) => <Paper key={row.id} variant="outlined" sx={{ p: 2 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                <Stack spacing={0.5} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                    <Typography variant="body2" color="text.secondary">{t(`finance.mapping.field.${row.source_field}`)}</Typography>
                    <Typography variant="h6">{row.source_value}</Typography>
                    <Typography>{row.behavior === "map" ? row.studio_name || t(`finance.mapping.channel.${row.channel}`) : t(`finance.mapping.behavior.${row.behavior}`)}</Typography>
                    <Stack direction="row" gap={0.5}>
                        {row.requires_review && <Chip size="small" color="warning" variant="outlined" label={t("finance.mapping.needsReview")} />}
                        {!row.active && <Chip size="small" label={t("finance.config.inactive")} />}
                    </Stack>
                </Stack>
                <Button disabled={busy || !companyWide} onClick={() => open(row)}>{t("finance.config.edit")}</Button>
            </Stack></Paper>)}
        </>}
        <Dialog open={Boolean(form || setup)} onClose={() => { if (!busy) { setForm(null); setSetup(null); } }} fullWidth maxWidth="sm">
            <Box component="form" onSubmit={save}>
                <DialogTitle>{t(setup ? "finance.mapping.initialize" : form?.id ? "finance.mapping.edit" : "finance.mapping.add")}</DialogTitle>
                <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography>{company?.name}</Typography>
                    {formError && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{formError}</Alert>}
                    {setup ? <>
                        <Alert severity="info">{t("finance.mapping.setupHelp")}</Alert>
                        {studioLabels.map((label) => <TextField key={label} select required label={label} value={setup[label]} disabled={busy || conflict}
                            onChange={(event) => setSetup((old) => ({ ...old, [label]: event.target.value }))}>
                            <MenuItem value="">{t("finance.config.choose")}</MenuItem>
                            {companyStudios.map((studio) => <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>)}
                        </TextField>)}
                    </> : <>
                        {form?.id && <Alert severity="info">{t("finance.mapping.identityHelp")}</Alert>}
                        <TextField select label={t("finance.mapping.source_field")} value={form?.source_field || ""} disabled={busy || conflict || Boolean(form?.id)} onChange={(event) => changeForm("source_field", event.target.value)}>
                            {fields.map((field) => <MenuItem key={field} value={field}>{t(`finance.mapping.field.${field}`)}</MenuItem>)}
                        </TextField>
                        <Autocomplete freeSolo options={sourceOptions} value={form?.source_value || ""} disabled={busy || conflict || Boolean(form?.id)}
                            onInputChange={(_, value, reason) => { if (["input", "clear"].includes(reason)) changeForm("source_value", value); }}
                            onChange={(_, value) => changeForm("source_value", value || "")}
                            renderInput={(params) => <TextField {...params} required label={t("finance.mapping.source_value")} inputProps={{ ...params.inputProps, maxLength: 180 }} />} />
                        <TextField select label={t("finance.mapping.behavior")} value={form?.behavior || "map"} disabled={busy || conflict} onChange={(event) => changeForm("behavior", event.target.value)}>
                            {["map", "review", ...(form?.source_field === "alegra_price_list" ? ["neutral"] : [])].map((key) => <MenuItem key={key} value={key}>{t(`finance.mapping.behavior.${key}`)}</MenuItem>)}
                        </TextField>
                        {form?.behavior === "map" && <>
                            <TextField select required label={t(isPayment ? "finance.mapping.channel" : "finance.config.studio")} value={isPayment ? form.channel : form.studio || ""} disabled={busy || conflict}
                                onChange={(event) => changeForm(isPayment ? "channel" : "studio", event.target.value)}>
                                <MenuItem value="">{t("finance.config.choose")}</MenuItem>
                                {(isPayment ? channels.map((channel) => ({ id: channel, name: t(`finance.mapping.channel.${channel}`) })) : companyStudios).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                            </TextField>
                            <FormControlLabel label={t("finance.mapping.requires_review")} control={<Switch checked={Boolean(form.requires_review)} disabled={busy || conflict} onChange={(_, checked) => changeForm("requires_review", checked)} />} />
                        </>}
                        <FormControlLabel label={t("finance.config.active")} control={<Switch checked={Boolean(form?.active)} disabled={busy || conflict} onChange={(_, checked) => changeForm("active", checked)} />} />
                    </>}
                </Stack></DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => { setForm(null); setSetup(null); }}>{t("finance.config.cancel")}</Button>
                    {conflict && <Button onClick={async () => { setForm(null); setSetup(null); await load(); }}>{t("access.reload")}</Button>}
                    <Button type="submit" variant="contained" disabled={busy || conflict}>{busy ? <CircularProgress size={20} /> : t("finance.config.save")}</Button>
                </DialogActions>
            </Box>
        </Dialog>
    </Stack>;
}

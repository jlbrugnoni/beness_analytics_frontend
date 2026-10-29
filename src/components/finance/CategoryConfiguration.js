import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";

const headers = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const endpoint = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const errorText = (error, t) => {
    if (error.response?.status === 409) return t("finance.config.conflict");
    const details = error.response?.data;
    return typeof details === "object" ? Object.entries(details).map(([key, value]) => {
        const message = Array.isArray(value) ? value.join(" ") : String(value);
        return ["non_field_errors", "detail"].includes(key) ? message
            : `${t(`finance.category.${key}`, t(`finance.config.${key}`, key))}: ${message}`;
    }).join("\n") : t("finance.config.error");
};

export default function CategoryConfiguration({ companies, sites, sensitiveAccess, onCompanyUpdated }) {
    const { t } = useI18n();
    const [companyId, setCompanyId] = useState(companies[0]?.id || "");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState(null);
    const [formError, setFormError] = useState(null);
    const [conflict, setConflict] = useState(false);
    const version = useRef(0);
    const company = companies.find((item) => item.id === Number(companyId));
    const companyWide = sites.some((site) => site.id === company?.site);
    const load = useCallback(async () => {
        const requestVersion = ++version.current;
        setRows([]); setLoadFailed(false); setLoading(true);
        if (!companyId) { setLoading(false); return; }
        try {
            let next = endpoint(`categories/?company=${companyId}`); const result = [];
            while (next) {
                const response = await axios.get(next, headers());
                result.push(...response.data.results); next = response.data.next;
            }
            if (requestVersion === version.current) setRows(result);
        } catch {
            if (requestVersion === version.current) setLoadFailed(true);
        } finally { if (requestVersion === version.current) setLoading(false); }
    }, [companyId]);
    useEffect(() => { load(); return () => { version.current += 1; }; }, [load]);
    const roots = rows.filter((row) => !row.parent);
    const parent = rows.find((row) => row.id === Number(form?.parent));
    const open = (record = null, parentRecord = null) => {
        setForm(record ? { ...record } : { company: Number(companyId), parent: parentRecord?.id || null, name: "",
            sensitive: false, active: true, default_treatment: parentRecord ? "" : "operating",
            default_allocation: parentRecord ? "" : "direct" });
        setFormError(null); setConflict(false); setFeedback(null);
    };
    const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
    const initialize = async () => {
        setBusy(true); setFeedback(null);
        try {
            const response = await axios.post(endpoint(`companies/${company.id}/initialize-categories/`), { expected_revision: company.revision }, headers());
            onCompanyUpdated(response.data.company);
            setFeedback({ severity: "success", text: t("finance.category.initialized") });
            await load();
        } catch (error) { setFeedback({ severity: "error", text: errorText(error, t) }); }
        finally { setBusy(false); }
    };
    const save = async (event) => {
        event.preventDefault(); setBusy(true); setFormError(null);
        const payload = Object.fromEntries(["company", "parent", "name", "default_treatment", "default_allocation", "sensitive", "active"].map((key) => [key, form[key]]));
        if (form.id) payload.expected_revision = form.revision;
        if (parent) payload.expected_parent_revision = parent.revision;
        try {
            await axios[form.id ? "patch" : "post"](endpoint(`categories/${form.id ? `${form.id}/` : ""}`), payload, headers());
            setForm(null); setFeedback({ severity: "success", text: t("finance.config.saved") }); await load();
        } catch (error) { setConflict(error.response?.status === 409); setFormError(errorText(error, t)); }
        finally { setBusy(false); }
    };
    const editButton = (row) => <Button onClick={() => open(row)} disabled={!row.can_edit || busy}>{t("finance.config.edit")}</Button>;
    const badges = (row) => <Stack direction="row" gap={0.5} flexWrap="wrap">
        <Chip size="small" label={t(`finance.category.treatment.${row.effective_treatment}`)} />
        <Chip size="small" label={t(`finance.category.allocation.${row.effective_allocation}`)} />
        {row.effective_sensitive && <Chip size="small" color="warning" variant="outlined" label={t(row.parent && !row.sensitive ? "finance.category.inheritedSensitive" : "finance.category.sensitive")} />}
        {!row.effective_active && <Chip size="small" label={t(row.active ? "finance.category.parentInactive" : "finance.config.inactive")} />}
    </Stack>;
    return <Stack spacing={2}>
        <Alert severity="info">{t("finance.category.intro")}</Alert>
        <TextField select fullWidth label={t("finance.config.company")} value={companyId} disabled={busy}
            onChange={(event) => { setCompanyId(event.target.value); setFeedback(null); setForm(null); }}>
            {companies.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
        </TextField>
        {feedback && <Alert severity={feedback.severity} sx={{ whiteSpace: "pre-line" }}>{feedback.text}</Alert>}
        {!companyWide && company && <Alert severity="info">{t("finance.category.scopeHelp")}</Alert>}
        {!sensitiveAccess && companyWide && <Alert severity="info">{t("finance.category.privacyHelp")}</Alert>}
        {loading && <CircularProgress size={24} />}
        {loadFailed && <Alert severity="error" action={<Button onClick={load}>{t("access.reload")}</Button>}>{t("finance.config.error")}</Alert>}
        {!loading && !loadFailed && company && <>
            {!rows.length && !company.category_catalog_version && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
                <Typography>{t("finance.category.templateHelp")}</Typography>
                <Button variant="outlined" disabled={busy || !companyWide || !sensitiveAccess || !company.active} onClick={initialize}>{t("finance.category.initialize")}</Button>
            </Stack></Paper>}
            <Button variant="contained" disabled={busy || !companyWide || !company.active} sx={{ alignSelf: "flex-start" }} onClick={() => open()}>{t("finance.category.add")}</Button>
            {!roots.length && <Typography>{t("finance.config.empty")}</Typography>}
            {roots.map((root) => <Paper key={root.id} variant="outlined" sx={{ p: 2 }}><Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                    <Stack spacing={1}><Typography variant="h6">{root.name}</Typography>{badges(root)}</Stack>
                    <Stack direction="row" alignItems="center">{editButton(root)}
                        <Button disabled={busy || !root.can_add_child} onClick={() => open(null, root)}>{t("finance.category.addChild")}</Button>
                    </Stack>
                </Stack>
                {rows.filter((row) => row.parent === root.id).map((row) => <Box key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.5, pl: { xs: 0, sm: 2 } }}>
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}><Typography sx={{ overflowWrap: "anywhere" }}>{row.name}</Typography>{badges(row)}</Stack>
                        {editButton(row)}
                    </Stack>
                </Box>)}
            </Stack></Paper>)}
        </>}
        <Dialog open={Boolean(form)} onClose={() => { if (!busy) setForm(null); }} fullWidth maxWidth="sm">
            <Box component="form" onSubmit={save}>
                <DialogTitle>{t(form?.id ? "finance.category.edit" : form?.parent ? "finance.category.addChild" : "finance.category.add")}</DialogTitle>
                <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                    {formError && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{formError}</Alert>}
                    <Typography>{company?.name}{parent ? ` / ${parent.name}` : ""}</Typography>
                    <TextField label={t("finance.config.name")} required value={form?.name || ""} disabled={busy || conflict}
                        onChange={(event) => change("name", event.target.value)} inputProps={{ maxLength: 180 }} />
                    <TextField select label={t("finance.category.default_treatment")} value={form?.default_treatment || ""} disabled={busy || conflict}
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                        onChange={(event) => change("default_treatment", event.target.value)}>
                        {parent && <MenuItem value="">{t("finance.category.inherit")} ({t(`finance.category.treatment.${parent.effective_treatment}`)})</MenuItem>}
                        {["operating", "extraordinary", "review"].map((key) => <MenuItem key={key} value={key}>{t(`finance.category.treatment.${key}`)}</MenuItem>)}
                    </TextField>
                    <TextField select label={t("finance.category.default_allocation")} value={form?.default_allocation || ""} disabled={busy || conflict}
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                        onChange={(event) => change("default_allocation", event.target.value)}>
                        {parent && <MenuItem value="">{t("finance.category.inherit")} ({t(`finance.category.allocation.${parent.effective_allocation}`)})</MenuItem>}
                        {["direct", "administration"].map((key) => <MenuItem key={key} value={key}>{t(`finance.category.allocation.${key}`)}</MenuItem>)}
                    </TextField>
                    <Alert severity="info">{t("finance.category.defaultsHelp")}</Alert>
                    <FormControlLabel label={t("finance.category.sensitive")} control={<Switch checked={Boolean(form?.sensitive)} disabled={busy || conflict || !sensitiveAccess}
                        onChange={(_, checked) => change("sensitive", checked)} />} />
                    {parent?.effective_sensitive && <Alert severity="warning">{t("finance.category.inheritedHelp")}</Alert>}
                    <FormControlLabel label={t("finance.config.active")} control={<Switch checked={Boolean(form?.active)} disabled={busy || conflict}
                        onChange={(_, checked) => change("active", checked)} />} />
                </Stack></DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setForm(null)}>{t("finance.config.cancel")}</Button>
                    {conflict && <Button onClick={async () => { setForm(null); await load(); }}>{t("access.reload")}</Button>}
                    <Button type="submit" variant="contained" disabled={busy || conflict}>{busy ? <CircularProgress size={20} /> : t("finance.config.save")}</Button>
                </DialogActions>
            </Box>
        </Dialog>
    </Stack>;
}

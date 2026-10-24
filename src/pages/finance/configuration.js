import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControlLabel, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import CategoryConfiguration from "@/components/finance/CategoryConfiguration";

const sections = ["companies", "accounts", "terminals", "categories"];
const emptyData = { companies: [], accounts: [], terminals: [], sites: [], studios: [] };
const headers = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}/`;
const allPages = async (path) => {
    let next = api(path); const rows = [];
    while (next) {
        const response = await axios.get(next, headers());
        rows.push(...(response.data.results || response.data)); next = response.data.next;
    }
    return rows;
};

export default function FinanceConfiguration() {
    const { t } = useI18n();
    const access = useAccess();
    const canManage = Boolean(access.finance?.can_enter && access.capabilities?.can_manage_finance_settings);
    const canSeeAccounts = Boolean(access.capabilities?.can_view_finance_bank_accounts);
    const [section, setSection] = useState("companies");
    const [data, setData] = useState(emptyData);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(null);
    const [formSection, setFormSection] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [formError, setFormError] = useState(null);
    const [conflict, setConflict] = useState(false);
    const loadVersion = useRef(0);
    const load = useCallback(async () => {
        const version = ++loadVersion.current;
        if (!canManage) { setData(emptyData); setLoading(false); return false; }
        setLoading(true); setLoadError(false);
        try {
            const [companies, accounts, terminals, options] = await Promise.all([
                allPages("companies"), canSeeAccounts ? allPages("accounts") : [],
                canSeeAccounts ? allPages("terminals") : [], axios.get(api("configuration-options"), headers()),
            ]);
            if (version === loadVersion.current) setData({ companies, accounts, terminals, ...options.data });
            return true;
        } catch {
            if (version === loadVersion.current) { setData(emptyData); setLoadError(true); }
            return false;
        } finally { if (version === loadVersion.current) setLoading(false); }
    }, [canManage, canSeeAccounts]);
    useEffect(() => { load(); return () => { loadVersion.current += 1; }; }, [load]);
    useEffect(() => { if (!canManage) setForm(null); }, [canManage]);
    const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
    const open = (record) => {
        const company = data.companies.find((item) => item.active);
        setFormSection(section); setFormError(null); setConflict(false); setFeedback(null);
        setForm(record ? { ...record, studios: [...(record.studios || [])] } : {
            active: true, name: "", site: "", default_currency: "DOP",
            company: company?.id || "", currency: company?.default_currency || "DOP", kind: "bank", bank_name: "",
            studios: [], statement_imports_expected: true, opening_balance: "", opening_balance_date: "",
            account: "", identifier: "", studio: "", channel: "card_terminal",
        });
    };
    const close = () => { if (!saving) setForm(null); };
    const save = async (event) => {
        event.preventDefault(); setSaving(true); setFormError(null);
        const fieldNames = {
            companies: ["name", "site", "default_currency", "active"],
            accounts: ["company", "name", "kind", "currency", "bank_name", "studios", "active", "statement_imports_expected", "opening_balance", "opening_balance_date"],
            terminals: ["account", "identifier", "studio", "channel", "active"],
        };
        const payload = Object.fromEntries(fieldNames[formSection].map((key) => [key, form[key]]));
        if (formSection === "accounts") {
            payload.opening_balance = form.opening_balance === "" || form.opening_balance == null ? null : form.opening_balance;
            payload.opening_balance_date = form.opening_balance_date || null;
        }
        if (form.id) payload.expected_revision = form.revision;
        try {
            await axios[form.id ? "patch" : "post"](api(`${formSection}${form.id ? `/${form.id}` : ""}`), payload, headers());
            setForm(null); setFeedback(t("finance.config.saved")); await load();
        } catch (error) {
            const stale = error.response?.status === 409;
            setConflict(stale);
            const details = error.response?.data;
            setFormError(stale ? t("finance.config.conflict") : typeof details === "object"
                ? Object.entries(details).map(([key, value]) => `${t(`finance.config.${key}`, key)}: ${Array.isArray(value) ? value.join(" ") : String(value)}`).join("\n")
                : t("finance.config.error"));
        } finally { setSaving(false); }
    };
    const selectedCompany = data.companies.find((item) => item.id === Number(form?.company));
    const selectedAccount = data.accounts.find((item) => item.id === Number(form?.account));
    const selectedAccountCompany = data.companies.find((item) => item.id === selectedAccount?.company);
    const studioOptions = data.studios.filter((studio) => studio.site_id ===
        (formSection === "terminals" ? selectedAccountCompany?.site : selectedCompany?.site));
    const field = (key, props = {}) => <TextField fullWidth label={t(`finance.config.${key}`)} value={form?.[key] ?? ""}
        onChange={(event) => set(key, event.target.value)} {...props} />;
    const select = (key, options, props = {}) => field(key, { select: true, required: true, ...props, children: [
        <MenuItem key="empty" value="">{t("finance.config.choose")}</MenuItem>,
        ...options.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>),
    ] });
    const check = (key) => <FormControlLabel label={t(`finance.config.${key}`)} control={<Switch
        checked={Boolean(form?.[key])} onChange={(_, checked) => set(key, checked)} />} />;
    const accountTabsBlocked = ["accounts", "terminals"].includes(section) && !canSeeAccounts;
    const rows = data[section];
    return <MainPage><Head><title>{t("finance.config.title")} | Beness Analytics</title></Head>
        <Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100 }}>
            <Button component={Link} href="/finance" sx={{ alignSelf: "flex-start" }}>{t("finance.config.back")}</Button>
            <Typography variant="h4" component="h1">{t("finance.config.title")}</Typography>
            <Typography color="text.secondary">{t("finance.config.intro")}</Typography>
            {!canManage && <Alert severity="warning">{t("finance.denied")}</Alert>}
            {canManage && <>
                <Tabs value={section} onChange={(_, value) => { setSection(value); setFeedback(null); }} variant="scrollable" scrollButtons="auto">
                    {sections.map((key) => <Tab key={key} value={key} label={t(`finance.config.${key}`)} />)}
                </Tabs>
                {feedback && <Alert severity="success">{feedback}</Alert>}
                {loadError && <Alert severity="error" action={<Button onClick={load}>{t("access.reload")}</Button>}>{t("finance.config.error")}</Alert>}
                {loading ? <CircularProgress /> : section === "categories" ? <CategoryConfiguration companies={data.companies}
                    sites={data.sites} sensitiveAccess={Boolean(access.capabilities?.can_view_sensitive_finance)}
                    onCompanyUpdated={(company) => setData((old) => ({ ...old, companies: old.companies.map((item) => item.id === company.id ? company : item) }))} />
                    : accountTabsBlocked ? <Alert severity="info">{t("finance.config.accountAccess")}</Alert> : <>
                    <Button variant="contained" sx={{ alignSelf: "flex-start" }} disabled={loadError || (section === "companies" && !data.sites.length)} onClick={() => open(null)}>{t(`finance.config.add.${section}`)}</Button>
                    {section === "companies" && !data.sites.length && <Alert severity="info">{t("finance.config.siteAccess")}</Alert>}
                    {!loadError && rows.length === 0 && <Typography>{t("finance.config.empty")}</Typography>}
                    {rows.map((row) => <Paper key={row.id} variant="outlined" sx={{ p: 2 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "center" }}>
                            <Stack spacing={0.5} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                                <Typography variant="h6">{row.name || row.identifier}</Typography>
                                {section === "companies" && <Typography>{row.country_code} · {row.default_currency}</Typography>}
                                {section === "accounts" && <>
                                    <Typography>{data.companies.find((item) => item.id === row.company)?.name} · {row.currency} · {t(`finance.config.kind.${row.kind}`)}</Typography>
                                    <Typography variant="body2">{t("finance.config.opening_balance")}: {row.opening_balance == null ? t("finance.config.unknown") : `${row.opening_balance} ${row.currency} (${row.opening_balance_date})`}</Typography>
                                    <Typography variant="body2">{t(row.statement_imports_expected ? "finance.config.statementsYes" : "finance.config.statementsNo")}</Typography>
                                </>}
                                {section === "terminals" && <Typography>{row.studio_name} · {t(`finance.config.channel.${row.channel}`)} · {row.account_name}</Typography>}
                                <Chip size="small" label={t(row.active ? "finance.config.active" : "finance.config.inactive")} sx={{ alignSelf: "flex-start" }} />
                            </Stack>
                            <Button onClick={() => open(row)} disabled={section === "companies" && !data.sites.some((site) => site.id === row.site)}>{t("finance.config.edit")}</Button>
                        </Stack>
                    </Paper>)}
                </>}
            </>}
        </Stack>
        <Dialog open={Boolean(form)} onClose={close} fullWidth maxWidth="sm">
            <Box component="form" onSubmit={save}>
                <DialogTitle>{t(form?.id ? "finance.config.edit" : `finance.config.add.${formSection}`)}</DialogTitle>
                <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                    {formError && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{formError}</Alert>}
                    <Box component="fieldset" disabled={saving || conflict} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}><Stack spacing={2}>
                        {formSection === "companies" && <>
                            {field("name", { required: true })}
                            {select("site", data.sites, { disabled: Boolean(form?.id) })}
                            {field("default_currency", { required: true, inputProps: { maxLength: 3, pattern: "[A-Z]{3}" }, disabled: Boolean(form?.id) })}
                        </>}
                        {formSection === "accounts" && <>
                            {select("company", data.companies.filter((item) => item.active || item.id === form?.company), {
                                disabled: Boolean(form?.id), onChange: (event) => {
                                    const company = data.companies.find((item) => item.id === Number(event.target.value));
                                    setForm((old) => ({ ...old, company: event.target.value, currency: company?.default_currency || "", studios: [] }));
                                },
                            })}
                            {field("name", { required: true })}
                            {select("kind", ["bank", "cash"].map((key) => ({ id: key, name: t(`finance.config.kind.${key}`) })))}
                            {field("currency", { disabled: true })}
                            {field("bank_name")}
                            <Typography variant="subtitle2">{t("finance.config.studios")}</Typography>
                            <Typography variant="body2" color="text.secondary">{t("finance.config.studiosHelp")}</Typography>
                            {studioOptions.map((studio) => <FormControlLabel key={studio.id} label={studio.name} control={<Checkbox checked={Boolean(form?.studios.includes(studio.id))}
                                onChange={(_, checked) => set("studios", checked ? [...form.studios, studio.id] : form.studios.filter((id) => id !== studio.id))} />} />)}
                            {check("statement_imports_expected")}
                            <Alert severity="info">{t("finance.config.balanceHelp")}</Alert>
                            {field("opening_balance", { type: "number", inputProps: { step: "0.01" } })}
                            {field("opening_balance_date", { type: "date", InputLabelProps: { shrink: true } })}
                        </>}
                        {formSection === "terminals" && <>
                            {select("account", data.accounts.filter((item) => (item.active && item.kind === "bank") || item.id === form?.account), {
                                disabled: Boolean(form?.id), onChange: (event) => setForm((old) => ({ ...old, account: event.target.value, studio: "" })),
                            })}
                            {field("identifier", { required: true, inputProps: { maxLength: 40 } })}
                            {select("studio", studioOptions.filter((studio) => !selectedAccount?.studios.length || selectedAccount.studios.includes(studio.id)))}
                            {select("channel", ["card_terminal", "recurring", "payment_link", "other"].map((key) => ({ id: key, name: t(`finance.config.channel.${key}`) })))}
                        </>}
                        {check("active")}
                    </Stack></Box>
                </Stack></DialogContent>
                <DialogActions>
                    <Button disabled={saving} onClick={close}>{t("finance.config.cancel")}</Button>
                    {conflict && <Button onClick={async () => { setForm(null); await load(); }}>{t("access.reload")}</Button>}
                    <Button type="submit" variant="contained" disabled={saving || conflict}>{saving ? <CircularProgress size={20} /> : t("finance.config.save")}</Button>
                </DialogActions>
            </Box>
        </Dialog>
    </MainPage>;
}

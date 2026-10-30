import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Head from "next/head";
import { Alert, Button, CircularProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import { fetchApiRows } from "@/utils/fetchApiRows";

const base = process.env.NEXT_PUBLIC_BACKEND_URL;
const headers = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
const api = (company) => `${base}/api/finance/category-catalog/${company}/`;
const errorText = (error, fallback) => {
    const data = error.response?.data;
    return data && typeof data === "object" ? Object.values(data).flat().map(String).join("\n") : fallback;
};

export default function CategoryCatalog() {
    const { t } = useI18n();
    const label = (key) => t(`finance.catalog.${key}`);
    const access = useAccess();
    const allowed = Boolean(access.finance?.can_enter && access.capabilities?.can_import_finance_migration && access.capabilities?.can_view_sensitive_finance);
    const [companies, setCompanies] = useState([]);
    const [company, setCompany] = useState("");
    const [source, setSource] = useState("csv");
    const [mode, setMode] = useState("merge");
    const [file, setFile] = useState(null);
    const [plan, setPlan] = useState(null);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const generation = useRef(0);
    useEffect(() => {
        let active = true;
        if (!allowed) return undefined;
        setLoading(true);
        fetchApiRows(`${base}/api/finance/companies/`, headers(), base).then((rows) => {
            if (active) { setCompanies(rows); setCompany((value) => value || (rows.length === 1 ? rows[0].id : "")); }
        }).catch((failure) => { if (active) setError(errorText(failure, t("finance.config.error"))); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [allowed, t]);
    useEffect(() => { generation.current += 1; setPlan(null); setSuccess(false); setError(""); }, [company, source, mode, file]);
    const run = async (apply = false) => {
        const current = ++generation.current;
        setBusy(true); setError(""); setSuccess(false);
        const body = new FormData();
        body.append("source", source); body.append("mode", mode);
        if (source === "csv") body.append("file", file);
        if (apply) body.append("expected_plan", plan.token);
        try {
            const { data } = await axios.post(api(company), body, headers());
            if (generation.current === current) { setPlan(data); setSuccess(data.applied); }
        } catch (failure) {
            if (generation.current === current) { setPlan(null); setError(errorText(failure, label("error"))); }
        } finally { setBusy(false); }
    };
    const download = async () => {
        setBusy(true); setError("");
        try {
            const response = await axios.get(api(company), { ...headers(), responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement("a"); anchor.href = url; anchor.download = `finance-category-catalog-${company}.csv`;
            anchor.click(); URL.revokeObjectURL(url);
        } catch (failure) {
            let message = label("error");
            try { message = Object.values(JSON.parse(await failure.response.data.text())).flat().map(String).join("\n"); } catch { /* Use the translated fallback for network failures. */ }
            setError(message);
        } finally { setBusy(false); }
    };
    return <MainPage><Head><title>{label("title")} | Beness Analytics</title></Head>
        <Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, minWidth: 0, width: "100%", boxSizing: "border-box" }}>
            <Button component={Link} href="/finance" sx={{ alignSelf: "flex-start" }}>{t("finance.config.back")}</Button>
            <Typography variant="h4" component="h1">{label("title")}</Typography>
            <Typography>{label("help")}</Typography>
            {!allowed ? <Alert severity="warning">{label("permission")}</Alert> : <>
                {loading && <CircularProgress size={24} />}
                {error && <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>{error}</Alert>}
                {success && <Alert severity="success">{label("saved")}</Alert>}
                <TextField select label={t("finance.config.company")} value={company} disabled={busy || loading} onChange={(event) => setCompany(event.target.value)}>
                    <MenuItem value="">{t("finance.config.choose")}</MenuItem>
                    {companies.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </TextField>
                <Button variant="outlined" sx={{ alignSelf: "flex-start" }} disabled={!company || busy} onClick={download}>{label("export")}</Button>
                <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
                    <TextField select label={label("source")} value={source} disabled={busy} onChange={(event) => setSource(event.target.value)}>
                        <MenuItem value="csv">{label("csv")}</MenuItem><MenuItem value="starting">{label("restore")}</MenuItem>
                    </TextField>
                    {source === "csv" && <>
                        <Button component="label" variant="outlined" disabled={busy}>{file?.name || label("choose")}<input type="file" accept=".csv,text/csv" hidden disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} /></Button>
                        <Typography variant="body2">{label("format")}</Typography>
                    </>}
                    <TextField select label={label("mode")} value={mode} disabled={busy} onChange={(event) => setMode(event.target.value)}>
                        <MenuItem value="merge">{label("merge")}</MenuItem><MenuItem value="replace">{label("replace")}</MenuItem>
                    </TextField>
                    <Alert severity="info">{label("preserve")}</Alert>
                    <Button variant="outlined" disabled={busy || !company || (source === "csv" && !file)} onClick={() => run(false)}>{label("preview")}</Button>
                </Stack></Paper>
                {busy && <CircularProgress size={24} />}
                {plan && <>
                    <Stack direction="row" spacing={2} flexWrap="wrap">{Object.entries(plan.counts).map(([key, value]) => <Typography key={key}>{label(key)}: {value}</Typography>)}</Stack>
                    {!plan.applied && <Alert severity="warning">{label("confirm")}</Alert>}
                    <TableContainer component={Paper} sx={{ maxHeight: 480 }}><Table size="small" stickyHeader>
                        <TableHead><TableRow>{["action", "code", "parent", "name", "treatment", "allocation", "sensitive", "active"].map((key) => <TableCell key={key}>{label(key)}</TableCell>)}</TableRow></TableHead>
                        <TableBody>{plan.rows.map((row) => <TableRow key={row.catalog_code}>
                            <TableCell>{label(row.action)}</TableCell><TableCell>{row.target_code}{row.target_code !== row.catalog_code ? ` (${row.catalog_code})` : ""}</TableCell>
                            <TableCell>{row.parent_code || "—"}</TableCell><TableCell>{row.name}</TableCell>
                            <TableCell>{row.default_treatment ? t(`finance.category.treatment.${row.default_treatment}`) : "—"}</TableCell>
                            <TableCell>{row.default_allocation ? t(`finance.category.allocation.${row.default_allocation}`) : "—"}</TableCell>
                            <TableCell>{row.sensitive == null ? "—" : label(row.sensitive ? "yes" : "no")}</TableCell><TableCell>{row.active == null ? "—" : label(row.active ? "yes" : "no")}</TableCell>
                        </TableRow>)}</TableBody>
                    </Table></TableContainer>
                    <Button variant="contained" disabled={busy || plan.applied} onClick={() => run(true)}>{label("apply")}</Button>
                </>}
            </>}
        </Stack>
    </MainPage>;
}

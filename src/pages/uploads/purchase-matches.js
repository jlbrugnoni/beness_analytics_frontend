import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    LinearProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField,
} from "@mui/material";
import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import useI18n from "@/hooks/useI18n";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
import styles from "@/styles/tablePage.module.css";

const fields = ["service", "sale_date", "activation_date", "expiration_date", "quantity", "total_amount", "cash_equivalent", "non_cash_equivalent", "activation_offset_days"];
const moneyFields = ["total_amount", "cash_equivalent", "non_cash_equivalent"];
const numericFields = [...moneyFields, "quantity", "activation_offset_days"];
const errorText = (error, fallback) => {
    const data = error.response?.data;
    if (Array.isArray(data)) return data.join(" ");
    return data?.detail || data?.error || fallback;
};

export default function PurchaseMatches() {
    const token = useFetchToken();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const endpoint = `${backendUrl}/api/data/purchase-match-reviews/`;
    const auth = useMemo(() => ({ headers: { Authorization: `Token ${token}` } }), [token]);
    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [filters, setFilters] = useState({ site: "", studio: "", status: "pending", search: "" });
    const [page, setPage] = useState(1);
    const [list, setList] = useState({ results: [], count: 0 });
    const [selected, setSelected] = useState(null);
    const [candidates, setCandidates] = useState({ results: [], count: 0 });
    const [candidatePage, setCandidatePage] = useState(1);
    const [candidateSearch, setCandidateSearch] = useState("");
    const [purchase, setPurchase] = useState(null);
    const [decision, setDecision] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        const fetchAll = async (resource) => {
            let url = `${backendUrl}/api/data/${resource}/`;
            const rows = [];
            while (url) {
                const response = await axios.get(url, { ...auth, signal: controller.signal });
                rows.push(...(response.data.results || response.data));
                url = normalizeApiNextUrl(response.data.next, backendUrl);
            }
            return rows;
        };
        Promise.all([fetchAll("sites"), fetchAll("studios")]).then(([nextSites, nextStudios]) => {
            setSites(nextSites); setStudios(nextStudios);
        }).catch((err) => { if (!axios.isCancel(err)) setError(errorText(err, t("purchaseReview.loadError"))); });
        return () => controller.abort();
    }, [token, backendUrl, auth, t]);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        setLoading(true);
        axios.get(endpoint, { ...auth, params: { ...filters, page }, signal: controller.signal })
            .then(({ data }) => setList(data))
            .catch((err) => { if (!axios.isCancel(err)) setError(errorText(err, t("purchaseReview.loadError"))); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [token, endpoint, auth, filters, page, refresh, t]);

    useEffect(() => {
        if (!selected || selected.status !== "pending") return;
        const controller = new AbortController();
        setLoadingCandidates(true);
        setCandidates({ results: [], count: 0 });
        axios.get(`${endpoint}${selected.id}/candidates/`, {
            ...auth, params: { page: candidatePage, search: candidateSearch }, signal: controller.signal,
        }).then(({ data }) => setCandidates(data))
            .catch((err) => { if (!axios.isCancel(err)) setError(errorText(err, t("purchaseReview.loadError"))); })
            .finally(() => { if (!controller.signal.aborted) setLoadingCandidates(false); });
        return () => controller.abort();
    }, [selected, endpoint, auth, candidatePage, candidateSearch, t]);

    const changeFilter = (key, value) => {
        setFilters((previous) => ({ ...previous, [key]: value, ...(key === "site" ? { studio: "" } : {}) }));
        setPage(1); setSelected(null); setPurchase(null); setError("");
    };
    const selectReview = (row) => {
        setSelected(row); setPurchase(null); setCandidatePage(1); setCandidateSearch(""); setNote(""); setError("");
    };
    const display = (key, value) => {
        if (value === null || value === undefined || value === "") return moneyFields.includes(key) ? t("common.restricted") : "—";
        return numericFields.includes(key) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
    };
    const differs = (key) => purchase && (
        numericFields.includes(key) && selected.incoming[key] != null && purchase[key] != null
            ? Number(selected.incoming[key]) !== Number(purchase[key])
            : (selected.incoming[key] ?? "") !== (purchase[key] ?? "")
    );
    const submit = async () => {
        setSaving(true); setError("");
        try {
            await axios.post(`${endpoint}${selected.id}/resolve/`, {
                decision, raw_row_id: selected.latest_raw_row, purchase_id: purchase?.id,
                purchase_updated_at: purchase?.updated_at, note,
            }, auth);
            setSuccess(t("purchaseReview.saved")); setSelected(null); setPurchase(null);
            setDecision(""); setPage(1); setRefresh((value) => value + 1);
        } catch (err) {
            setError(errorText(err, t("purchaseReview.saveError")));
            setDecision("");
        } finally { setSaving(false); }
    };

    return <MainPage>
        <Head><title>Beness Analytics | {t("purchaseReview.title")}</title></Head>
        <div className={styles.container}>
            <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <h1>{t("purchaseReview.title")}</h1>
                    <Button component={Link} href="/uploads">{t("purchaseReview.back")}</Button>
                </Stack>
                <Alert severity="info">{t("purchaseReview.explanation")}</Alert>
                {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" flexWrap="wrap" gap={2}>
                        <TextField select label={t("common.site")} value={filters.site} onChange={(e) => changeFilter("site", e.target.value)} sx={{ minWidth: 180 }}>
                            <MenuItem value="">{t("purchaseReview.all")}</MenuItem>
                            {sites.map((site) => <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>)}
                        </TextField>
                        <TextField select label={t("common.studio")} value={filters.studio} onChange={(e) => changeFilter("studio", e.target.value)} sx={{ minWidth: 180 }}>
                            <MenuItem value="">{t("purchaseReview.all")}</MenuItem>
                            {studios.filter((studio) => !filters.site || String(studio.site) === String(filters.site)).map((studio) => <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>)}
                        </TextField>
                        <TextField select label={t("common.status")} value={filters.status} onChange={(e) => changeFilter("status", e.target.value)} sx={{ minWidth: 200 }}>
                            {["pending", "update", "create", "ignore", "all"].map((value) => <MenuItem key={value} value={value}>{t(`purchaseReview.${value}`)}</MenuItem>)}
                        </TextField>
                        <TextField label={t("purchaseReview.search")} value={filters.search} onChange={(e) => changeFilter("search", e.target.value)} />
                        <Button onClick={() => { setSelected(null); setPurchase(null); setRefresh((value) => value + 1); }}>{t("purchaseReview.refresh")}</Button>
                    </Stack>
                </Paper>
                <Paper sx={{ p: 2 }}>
                    {loading && <LinearProgress />}
                    <p>{t("purchaseReview.results")}: {list.count}</p>
                    <TableContainer>
                        <Table size="small">
                            <TableHead><TableRow>{["client", "studio", "service", "sale_date", "status"].map((key) => <TableCell key={key}>{t(`purchaseReview.${key}`)}</TableCell>)}<TableCell /></TableRow></TableHead>
                            <TableBody>{list.results.map((row) => <TableRow key={row.id} selected={selected?.id === row.id}>
                                <TableCell>{row.client_name}<br /><small>{row.client_mindbody_id}</small></TableCell>
                                <TableCell>{row.site_name}<br />{row.studio_name}</TableCell>
                                <TableCell>{row.incoming.service}</TableCell><TableCell>{row.incoming.sale_date}</TableCell>
                                <TableCell><Chip size="small" color={row.status === "pending" ? "warning" : "default"} label={t(`purchaseReview.${row.status}`)} /></TableCell>
                                <TableCell><Button disabled={loading} onClick={() => selectReview(row)}>{t("purchaseReview.review")}</Button></TableCell>
                            </TableRow>)}</TableBody>
                        </Table>
                    </TableContainer>
                    {!loading && !list.results.length && <p>{t("purchaseReview.empty")}</p>}
                    <Stack direction="row" gap={2} alignItems="center" mt={2}>
                        <Button disabled={loading || !list.previous} onClick={() => setPage(page - 1)}>{t("purchaseReview.previous")}</Button>
                        <span>{page}</span>
                        <Button disabled={loading || !list.next} onClick={() => setPage(page + 1)}>{t("purchaseReview.next")}</Button>
                    </Stack>
                </Paper>
                {selected && <Paper sx={{ p: 3 }}>
                    <h2>{selected.client_name} · {selected.studio_name}</h2>
                    <p>{selected.file_name} · {t("purchaseReview.row")}: {selected.row_number} · {t("purchaseReview.import")}: {selected.report_import_id}</p>
                    <Alert severity="warning">{t(`purchaseReview.reason.${selected.reason}`)}</Alert>
                    <TableContainer sx={{ my: 2 }}><Table size="small">
                        <TableHead><TableRow><TableCell>{t("purchaseReview.field")}</TableCell><TableCell>{t("purchaseReview.incoming")}</TableCell><TableCell>{t("purchaseReview.existing")}{purchase ? ` #${purchase.id}` : ""}</TableCell></TableRow></TableHead>
                        <TableBody>{fields.map((key) => <TableRow key={key} sx={differs(key) ? { backgroundColor: "#fff3df" } : {}}>
                            <TableCell>{t(`purchaseReview.${key}`)} {differs(key) && <small>({t("purchaseReview.changed")})</small>}</TableCell>
                            <TableCell>{display(key, selected.incoming[key])}</TableCell><TableCell>{purchase ? display(key, purchase[key]) : "—"}</TableCell>
                        </TableRow>)}</TableBody>
                    </Table></TableContainer>
                    {selected.status === "pending" ? <Stack spacing={2}>
                        <h3>{t("purchaseReview.choose")}</h3>
                        <TextField label={t("purchaseReview.candidateSearch")} value={candidateSearch} onChange={(e) => { setCandidateSearch(e.target.value); setCandidatePage(1); setPurchase(null); }} />
                        {loadingCandidates && <LinearProgress />}
                        <TableContainer><Table size="small">
                            <TableHead><TableRow>{["service", "sale_date", "activation_date", "expiration_date", "total_amount"].map((key) => <TableCell key={key}>{t(`purchaseReview.${key}`)}</TableCell>)}<TableCell /></TableRow></TableHead>
                            <TableBody>{candidates.results.map((row) => <TableRow key={row.id} selected={purchase?.id === row.id}>
                                {["service", "sale_date", "activation_date", "expiration_date", "total_amount"].map((key) => <TableCell key={key}>{display(key, row[key])}</TableCell>)}
                                <TableCell><Button variant={purchase?.id === row.id ? "contained" : "outlined"} onClick={() => setPurchase(row)}>{t("purchaseReview.select")} #{row.id}</Button></TableCell>
                            </TableRow>)}</TableBody>
                        </Table></TableContainer>
                        {!loadingCandidates && !candidates.results.length && <p>{t("purchaseReview.noCandidates")}</p>}
                        <Stack direction="row" gap={2}>
                            <Button disabled={loadingCandidates || !candidates.previous} onClick={() => setCandidatePage(candidatePage - 1)}>{t("purchaseReview.previous")}</Button>
                            <Button disabled={loadingCandidates || !candidates.next} onClick={() => setCandidatePage(candidatePage + 1)}>{t("purchaseReview.next")}</Button>
                        </Stack>
                        <TextField label={t("purchaseReview.note")} multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 2000 }} />
                        <Stack direction="row" flexWrap="wrap" gap={2}>
                            <Button variant="contained" disabled={!purchase || saving || loadingCandidates} onClick={() => setDecision("update")}>{t("purchaseReview.action.update")}</Button>
                            <Button variant="outlined" disabled={saving} onClick={() => setDecision("create")}>{t("purchaseReview.action.create")}</Button>
                            <Button color="inherit" disabled={saving} onClick={() => setDecision("ignore")}>{t("purchaseReview.action.ignore")}</Button>
                        </Stack>
                    </Stack> : <Alert severity="success">
                        {t(`purchaseReview.${selected.status}`)}{selected.purchase ? ` #${selected.purchase}` : ""} · {selected.resolved_by_name} · {selected.resolved_at ? new Date(selected.resolved_at).toLocaleString() : ""}
                        {selected.note && <p>{selected.note}</p>}
                    </Alert>}
                    {selected.decision_history?.length > 1 && <div>
                        <h3>{t("purchaseReview.history")}</h3>
                        {selected.decision_history.map((entry, index) => <p key={index}>
                            {t(`purchaseReview.${entry.decision}`)}{entry.purchase_id ? ` #${entry.purchase_id}` : ""}
                            {" · "}{entry.resolved_by_name}{" · "}{new Date(entry.resolved_at).toLocaleString()}
                            {entry.note ? ` · ${entry.note}` : ""}
                        </p>)}
                    </div>}
                </Paper>}
            </Stack>
        </div>
        <Dialog open={Boolean(decision)} onClose={() => { if (!saving) setDecision(""); }} maxWidth="sm" fullWidth>
            <DialogTitle>{decision ? t(`purchaseReview.action.${decision}`) : ""}</DialogTitle>
            <DialogContent>
                <p>{decision ? t(`purchaseReview.confirm.${decision}`) : ""}</p>
                <p>{selected?.client_name} · {selected?.incoming.service} · {selected?.incoming.sale_date}</p>
                {decision === "update" && <p>{t("purchaseReview.existing")} #{purchase?.id} · {purchase?.service} · {purchase?.activation_date} — {purchase?.expiration_date}</p>}
                {saving && <LinearProgress />}
            </DialogContent>
            <DialogActions><Button disabled={saving} onClick={() => setDecision("")}>{t("common.cancel")}</Button><Button variant="contained" disabled={saving} onClick={submit}>{t("common.save")}</Button></DialogActions>
        </Dialog>
    </MainPage>;
}

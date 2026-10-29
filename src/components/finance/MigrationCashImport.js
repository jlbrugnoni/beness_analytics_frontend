import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import { fetchApiRows } from "@/utils/fetchApiRows";
import { formatMoney } from "@/utils/formatMoney";
import { api, auth } from "./workspace/common";
import GeneralCashButton from "./GeneralCashButton";
import CashRecoveryDialog from "./CashRecoveryDialog";

export default function MigrationCashImport({ batch, canImport }) {
    const { t } = useI18n(); const access = useAccess(); const w = (key) => t(`finance.workspace.${key}`);
    const [accounts, setAccounts] = useState([]); const [account, setAccount] = useState(""); const [plan, setPlan] = useState(null);
    const [recovery, setRecovery] = useState(null);
    const [refresh, setRefresh] = useState(0); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const [error, setError] = useState(""); const [result, setResult] = useState(null);
    const loadAccounts = useCallback(async () => { const rows = await fetchApiRows(api("accounts/"), auth(), process.env.NEXT_PUBLIC_BACKEND_URL); const cash = rows.filter((a) => a.company === batch.company && a.kind === "cash" && a.active); setAccounts(cash); setAccount((old) => old || cash[0]?.id || ""); }, [batch.company]);
    useEffect(() => { loadAccounts().catch(() => setError(t("finance.workspace.error"))); }, [loadAccounts, t]);
    useEffect(() => { let active = true; setPlan(null); setConfirm(false);
        if (account) axios.get(api(`migration-imports/${batch.id}/cash-preview/?account=${account}`), auth()).then(({ data }) => { if (active) setPlan(data); }).catch(() => { if (active) setError(t("finance.workspace.error")); });
        return () => { active = false; };
    }, [account, batch.id, refresh, t]);
    const commit = async () => { setBusy(true); setError("");
        try { const { data } = await axios.post(api(`migration-imports/${batch.id}/import-cash/`), { account: Number(account), expected_plan: plan.token }, auth()); setResult(data); setConfirm(false); setRefresh((old) => old + 1); }
        catch { setError(w("cashImportError")); setConfirm(false); setRefresh((old) => old + 1); } finally { setBusy(false); }
    };
    return <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Typography variant="h6">{w("cashMigration")}</Typography><Typography>{w("cashMigrationHelp")}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {!accounts.length ? <>{access.capabilities?.can_manage_finance_settings && <GeneralCashButton company={batch.company} done={() => loadAccounts()} w={w} />}<Typography>{w("cashUnverified")}</Typography></> : <>
            <TextField select label={w("accountInto")} value={account} disabled={busy} onChange={(e) => setAccount(e.target.value)}>{accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
            {!plan ? <CircularProgress /> : <>
                <Typography>{w("newEntries")}: {plan.new} · {w("alreadyImported")}: {plan.already_imported} · {w("review")}: {plan.pending} · {formatMoney(plan.new_total)} {accounts.find((a) => a.id === Number(account))?.currency}</Typography>
                {result && <Alert severity="success">{w("cashImported")}: {result.created}</Alert>}
                <TableContainer><Table size="small"><TableHead><TableRow>{["source", "date", "amount", "business_description", "studio", "status"].map((key) => <TableCell key={key}>{w(key)}</TableCell>)}</TableRow></TableHead><TableBody>{plan.rows.map((row) => <TableRow key={row.row_id}><TableCell>{row.sheet}!{row.source_row}</TableCell><TableCell>{row.date || "—"}</TableCell><TableCell>{formatMoney(row.amount)}</TableCell><TableCell>{row.description || "—"}</TableCell><TableCell>{row.studio || "—"}</TableCell><TableCell>{w(`cash_${row.status}`)}{row.existing_account_name && ` · ${row.existing_account_name}`}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
                {canImport && access.capabilities?.can_edit_finance && <Stack direction="row" gap={1}><Button onClick={() => setRecovery("undo")}>{w("cashUndo")}</Button><Button onClick={() => setRecovery("restore")}>{w("cashRestore")}</Button></Stack>}
                <Button variant="contained" disabled={!canImport || busy || !plan.new} onClick={() => setConfirm(true)}>{w("importCash")}</Button>
            </>}
        </>}
        {recovery && <CashRecoveryDialog batch={batch.id} account={account} mode={recovery} close={() => setRecovery(null)} done={() => { setRecovery(null); setRefresh((n) => n + 1); }} />}
        <Dialog open={confirm} onClose={busy ? undefined : () => setConfirm(false)}><DialogTitle>{w("importCash")}</DialogTitle><DialogContent>{w("cashConfirm")} {plan?.new} · {formatMoney(plan?.new_total)}</DialogContent><DialogActions><Button disabled={busy} onClick={() => setConfirm(false)}>{w("close")}</Button><Button disabled={busy} onClick={commit}>{w("confirm")}</Button></DialogActions></Dialog>
    </Stack>;
}

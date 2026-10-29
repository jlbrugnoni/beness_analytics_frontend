import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { fetchApiRows } from "@/utils/fetchApiRows";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import BankPostingPanel from "./BankPostingPanel";

const root = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });

export default function MigrationBankImport({ batch, selected, setSelected, companies, copied, onBusy, label }) {
    const [copyCompany, setCopyCompany] = useState("");
    const [accounts, setAccounts] = useState([]); const [account, setAccount] = useState("");
    const [candidates, setCandidates] = useState(null); const [confirmed, setConfirmed] = useState(false);
    const [prepared, setPrepared] = useState(batch.bank_imports?.[0] || null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    useEffect(() => { let active = true;
        Promise.all([fetchApiRows(root("accounts/"), auth(), process.env.NEXT_PUBLIC_BACKEND_URL), axios.get(root(`migration-imports/${batch.id}/bank-candidates/`), auth())])
            .then(([result, choices]) => { if (!active) return; const rows = result; setAccounts(rows.filter((a) => a.company === batch.company && a.kind === "bank" && a.active)); setCandidates(choices.data); })
            .catch(() => { if (active) setError(label("error")); });
        return () => { active = false; };
    }, [batch.id, batch.company, label]);
    // A changed selection/account always needs a fresh origin confirmation and plan.
    const selectionKey = selected.join(",");
    useEffect(() => { setConfirmed(false); if (selectionKey || account) setPrepared(null); }, [selectionKey, account]);
    const prepare = async () => {
        setBusy(true); onBusy(true); setError("");
        try { const result = await axios.post(root(`migration-imports/${batch.id}/prepare-bank/`), { account: Number(account), row_ids: selected, confirm_bank_origin: confirmed }, auth()); setPrepared(result.data); }
        catch { setError(label("prepareError")); }
        finally { setBusy(false); onBusy(false); }
    };
    const copyPreview = async () => {
        setBusy(true); onBusy(true); setError("");
        try { const { data } = await axios.post(root(`migration-imports/${batch.id}/copy-to-company/`), { company: Number(copyCompany) }, auth()); copied(data); }
        catch { setError(label("prepareError")); }
        finally { setBusy(false); onBusy(false); }
    };
    return <Stack spacing={1}>
        <Typography variant="h6">{label("bankImport")}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {!accounts.length ? <>
            <Typography>{label("noBankAccount")} <Link href="/finance/configuration">{label("configureAccounts")}</Link></Typography>
            <Stack direction="row" gap={1}><TextField select fullWidth label={label("copyCompany")} value={copyCompany} disabled={busy} onChange={(e) => setCopyCompany(e.target.value)}><MenuItem value="">{label("chooseCompany")}</MenuItem>{companies.filter((c) => c.id !== batch.company && c.active).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField><Button disabled={busy || !copyCompany} onClick={copyPreview}>{label("copyPreview")}</Button></Stack><Typography variant="body2">{label("copyHelp")}</Typography>
        </> : <>
            <TextField select label={label("destinationAccount")} value={account} disabled={busy} onChange={(e) => setAccount(e.target.value)}><MenuItem value="">{label("chooseAccount")}</MenuItem>{accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</TextField>
            <Stack direction="row" gap={1}><Button disabled={busy || !candidates} onClick={() => setSelected(candidates.row_ids)}>{label("selectEligible")}</Button><Button disabled={busy || !selected.length} onClick={() => setSelected([])}>{label("clearSelection")}</Button><Typography sx={{ alignSelf: "center" }}>{label("selectedRows")}: {selected.length}</Typography></Stack>
            <Typography variant="body2">{label("selectionScope")}</Typography>
            {candidates && <Typography variant="body2">{label("cashPending")}: {candidates.cash_rows} · {label("invalidPending")}: {candidates.invalid_rows}</Typography>}
            <FormControlLabel control={<Checkbox checked={confirmed} disabled={busy || !account || !selected.length} onChange={(e) => setConfirmed(e.target.checked)} />} label={label("confirmBankOrigin")} />
            <Button variant="contained" sx={{ alignSelf: "flex-start" }} disabled={busy || !confirmed || !selected.length || !account || batch.status !== "preview" || Boolean(batch.file_issues.length) || prepared?.processing_status === "active"} onClick={prepare}>{label("prepareBank")}</Button>
            {prepared?.processing_status === "active" && <Button component={Link} href={`/finance/records?company=${batch.company}`}>{label("viewImported")}</Button>}
            {prepared && <BankPostingPanel key={prepared.id} batch={prepared} onProcessingUpdated={(id, status) => setPrepared((old) => old?.id === id ? { ...old, processing_status: status } : old)} />}
        </>}
    </Stack>;
}

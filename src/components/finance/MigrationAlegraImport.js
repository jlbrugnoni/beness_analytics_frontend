import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { formatMoney } from "@/utils/formatMoney";
import SalesPostingPanel from "./SalesPostingPanel";

const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });

export default function MigrationAlegraImport({ batch, label, canImport }) {
    const [data, setData] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    useEffect(() => { let active = true;
        axios.get(api(`migration-imports/${batch.id}/alegra/`), auth()).then(({ data: result }) => { if (active) setData(result); })
            .catch(() => { if (active) setError(label("error")); });
        return () => { active = false; };
    }, [batch.id, label]);
    const prepare = async () => {
        setBusy(true); setError("");
        try { const { data: result } = await axios.post(api(`migration-imports/${batch.id}/prepare-alegra/`), {}, auth()); setData((old) => ({ ...old, ...result })); }
        catch { setError(label("error")); } finally { setBusy(false); }
    };
    return <Stack spacing={2}>
        <Typography variant="h6">{label("alegraImport")}</Typography>
        <Typography>{label("alegraHelp")}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {!data ? <CircularProgress /> : <>
            <Typography>Alegra · {label("invoiceCount")}: {data.invoices.summary.invoice_count ?? 0} · {label("sourceTotal")}: {formatMoney(data.invoices.summary.paid_total)} DOP · {label("review")}: {data.invoices.summary.review_invoices ?? 0}</Typography>
            <Typography>Alegra_adm · {label("paymentCount")}: {data.payments.summary.rows ?? 0} · {label("sourceTotal")}: {formatMoney(data.payments.summary.amount_total)} DOP · {label("review")}: {data.payments.summary.review_rows ?? 0}</Typography>
            {[...data.invoices.file_issues, ...data.payments.file_issues].map((issue, i) => <Alert key={i} severity="warning">{issue}</Alert>)}
            {data.sales_batch && ["undone", "partial_undo"].includes(data.sales_batch.processing_status) && <Typography>{label("reprepareAlegraHelp")}</Typography>}
            {canImport && (!data.sales_batch || ["undone", "partial_undo"].includes(data.sales_batch.processing_status)) && <Button variant="contained" disabled={busy || Boolean(data.invoices.file_issues.length && data.payments.file_issues.length)} onClick={prepare}>{label(data.sales_batch ? "reprepareAlegra" : "prepareAlegra")}</Button>}
            {data.sales_batch && <>
                <Typography variant="h6">{label("invoiceStep")}</Typography>
                {data.sales_batch.file_issues.length ? <Alert severity="warning">{data.sales_batch.file_issues.join(" · ")}</Alert> : <SalesPostingPanel batch={data.sales_batch} onUpdated={(_, status) => setData((old) => ({ ...old, sales_batch: { ...old.sales_batch, processing_status: status } }))} />}
                <Typography variant="h6">{label("paymentStep")}</Typography>
                <Typography>{label("paymentStepHelp")}</Typography>
                {data.payment_batch?.file_issues.length ? <Alert severity="warning">{data.payment_batch.file_issues.join(" · ")}</Alert> : <Button variant="contained" component={Link} href={`/finance/payment-imports?batch=${data.payment_batch.id}`}>{label("reviewPayments")}</Button>}
                <Button component={Link} href={`/finance/records?company=${batch.company}`}>{label("viewImported")}</Button>
            </>}
        </>}
    </Stack>;
}

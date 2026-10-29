import { formatMoney, formatFinanceValue, formatFinanceCell } from "@/utils/formatMoney";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Head from "next/head";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";

export const api = (path) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/finance/${path}`;
export const auth = () => ({ headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } });
export const empty = { results: [], count: 0 };
export const routes = { bank: "bank-imports", invoices: "sales-imports", payments: "payment-imports" };
export const legacy = { bank: "imports", invoices: "sales-imports", payments: "payment-imports" };
export function useWorkspace() {
    const access = useAccess(); const { t } = useI18n();
    const canRead = Boolean(access.finance?.can_enter && access.capabilities?.can_view_sensitive_finance);
    const [options, setOptions] = useState({ companies: [], accounts: [], studios: [], categories: [] });
    const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [optionsRevision, setOptionsRevision] = useState(0);
    useEffect(() => { let active = true; setOptions({ companies: [], accounts: [], studios: [], categories: [] });
        if (canRead) { setLoading(true); axios.get(api("workspace/options/"), auth()).then(({ data }) => { if (active) setOptions(data); }).catch(() => { if (active) setError(t("finance.workspace.error")); }).finally(() => { if (active) setLoading(false); }); }
        return () => { active = false; };
    }, [canRead, t, optionsRevision]);
    return { access, canRead, options, loading, error, setError, reloadOptions: () => setOptionsRevision((old) => old + 1), t, w: (key) => t(`finance.workspace.${key}`, key) };
}
export function WorkspaceFrame({ title, children, current, company }) {
    const { t } = useI18n(); const access = useAccess(); const w = (key) => t(`finance.workspace.${key}`);
    return <MainPage><Head><title>{title} | Beness Analytics</title></Head><Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, minWidth: 0, width: "100%", boxSizing: "border-box" }}>
        <Stack direction="row" gap={1} useFlexGap flexWrap="wrap"><Button component={Link} href={`/finance/records${company ? `?company=${company}` : ""}`} variant={current === "records" ? "contained" : "text"}>{w("records")}</Button><Button component={Link} href={`/finance/upload${company ? `?company=${company}` : ""}`} variant={current === "upload" ? "contained" : "text"}>{w("upload")}</Button>{access.capabilities?.can_view_finance_bank_accounts && <Button component={Link} href={`/finance/closures${company ? `?company=${company}` : ""}`} variant={current === "closures" ? "contained" : "text"}>{w("closures")}</Button>}{access.capabilities?.can_manage_finance_settings && <Button component={Link} href="/finance/configuration">{w("settings")}</Button>}<Button component={Link} href={`/finance/migration-imports${company ? `?company=${company}` : ""}`}>{w("initialSetup")}</Button></Stack>
        <Typography component="h1" variant="h4">{title}</Typography>{children}
    </Stack></MainPage>;
}
// The API's default page size is 15; callers may supply server pagination metadata.
export function Pages({ data, page, setPage, busy, w, pageSize = 15 }) {
    const pages = Math.max(1, Math.ceil((data.count || 0) / (data.page_size || pageSize)));
    return <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap><Button disabled={busy || !data.previous} onClick={() => setPage(page - 1)}>{w("previous")}</Button><Typography>{w("page")} {page} {w("pageOf")} {pages} · {new Intl.NumberFormat("en-US").format(data.count || 0)} {w("paginationItems")}</Typography><Button disabled={busy || !data.next} onClick={() => setPage(page + 1)}>{w("next")}</Button></Stack>;
}
export function SourceFields({ source, w }) {
    return <TableContainer><Table size="small"><TableHead><TableRow><TableCell>{w("field")}</TableCell><TableCell>{w("value")}</TableCell></TableRow></TableHead><TableBody>{Object.entries(source || {}).filter(([, value]) => value !== null && typeof value !== "object").map(([key, value]) => <TableRow key={key}><TableCell>{w(key)}</TableCell><TableCell sx={{ overflowWrap: "anywhere" }}>{typeof value === "boolean" ? w(value ? "yes" : "no") : String(formatFinanceValue(key, value))}</TableCell></TableRow>)}</TableBody></Table></TableContainer>;
}
export function SourceDialog({ data, close, w }) {
    return <Dialog open={Boolean(data)} onClose={close} fullWidth maxWidth="md"><DialogTitle>{w("original")}</DialogTitle><DialogContent><Typography>{data?.file_name}</Typography>{data?.source_rows?.length > 0 && <Typography>{w("sourceRows")}: {data.source_rows.join(", ")}</Typography>}{data?.issues?.map((issue, index) => <Alert severity="warning" key={index}>{issue}</Alert>)}<SourceFields source={data?.source} w={w} />{data?.items?.length > 0 && <TableContainer><Table size="small"><TableHead><TableRow>{["item", "quantity", "amount"].map((k) => <TableCell key={k}>{w(k)}</TableCell>)}</TableRow></TableHead><TableBody>{data.items.map((item, index) => <TableRow key={index}><TableCell>{item.name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{item.total === "" || item.total == null ? "—" : formatMoney(item.total)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}{data?.cells?.length > 0 && <TableContainer><Table size="small"><TableBody>{data.cells.map((cell) => <TableRow key={cell.cell}><TableCell>{cell.cell}</TableCell><TableCell>{cell.column_label}</TableCell><TableCell>{String(formatFinanceCell(cell) ?? "—")}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}</DialogContent><DialogActions>{data?.href && <Button component={Link} href={data.href}>{w("advanced")}</Button>}<Button onClick={close}>{w("close")}</Button></DialogActions></Dialog>;
}

import { useEffect, useState } from "react";
import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";

export default function FinanceHome() {
    const { t } = useI18n();
    const access = useAccess();
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!access.finance?.can_enter) { setData(null); return undefined; }
        let active = true;
        axios.get(`${base}/api/finance/overview/`, {
            headers: { Authorization: `Token ${sessionStorage.getItem("token")}` },
        }).then((response) => { if (active) { setData(response.data); setError(null); } })
            .catch((failure) => { if (active) { setData(null); setError(failure.response?.status === 403 ? "finance.denied" : "finance.error"); } });
        return () => { active = false; };
    }, [base, access.finance?.can_enter]);
    return <MainPage><Head><title>{t("finance.title")} | Beness Analytics</title></Head>
        <Stack spacing={2} sx={{ p: 3, maxWidth: 1000 }}>
            <h1>{t("finance.title")}</h1>
            <Alert severity="info">{t("finance.stage")}</Alert>
            {access.capabilities?.can_manage_finance_settings && <Button component={Link} href="/finance/configuration" variant="contained" sx={{ alignSelf: "flex-start" }}>{t("finance.config.title")}</Button>}
            {access.capabilities?.can_view_finance_bank_accounts && access.capabilities?.can_view_sensitive_finance && <Button component={Link} href="/finance/imports" variant="outlined" sx={{ alignSelf: "flex-start" }}>{t("finance.import.title")}</Button>}
            {error && <Alert severity="error">{t(error)}</Alert>}
            {!error && !data && access.finance?.can_enter && <CircularProgress />}
            {data && !data.companies.length && <Typography>{t("finance.empty")}</Typography>}
            {data?.companies.map((company) => <Paper key={company.id} sx={{ p: 2 }}>
                <Typography variant="h6">{company.name}</Typography>
                <Typography>{t("finance.country")}: {company.country_code} · {t("finance.currency")}: {company.default_currency}</Typography>
            </Paper>)}
        </Stack>
    </MainPage>;
}

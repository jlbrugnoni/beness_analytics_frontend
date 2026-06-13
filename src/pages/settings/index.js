import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useAccess, { storeAccess } from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";


export default function Settings() {
    const access = useAccess();
    const { language, languages, setLanguage, t } = useI18n();
    const [feedback, setFeedback] = useState(null);
    const canViewAdminLogs = Boolean(access.capabilities?.can_view_admin_logs);
    const canManageUsers = Boolean(access.capabilities?.can_manage_users);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleLanguageChange = async (event) => {
        const nextLanguage = setLanguage(event.target.value);
        setFeedback(null);
        try {
            const response = await axios.patch(
                `${backendUrl}/api/data/me/language/`,
                { language: nextLanguage },
                { headers: { Authorization: `Token ${sessionStorage.getItem("token")}` } }
            );
            storeAccess(response.data);
            setFeedback({ severity: "success", message: t("settings.languageSaved") });
        } catch (error) {
            console.error("Language preference error:", error);
            setFeedback({ severity: "error", message: t("settings.languageError") });
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("settings.title")}</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>{t("settings.title")}</h1>
                </div>
                <div style={{ display: "grid", gap: "12px", maxWidth: "760px", width: "90%" }}>
                    {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}
                    <Paper style={{ padding: "18px", display: "grid", gap: "14px" }}>
                        <h2 style={{ margin: 0 }}>{t("settings.preferences")}</h2>
                        <p style={{ margin: 0, color: "#666" }}>{t("settings.languageHelp")}</p>
                        <TextField
                            select
                            label={t("common.language")}
                            value={language}
                            onChange={handleLanguageChange}
                            size="small"
                            style={{ maxWidth: 260 }}
                        >
                            {languages.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Paper>
                    {canViewAdminLogs && (
                        <Paper style={{ padding: "18px", display: "grid", gap: "10px" }}>
                            <h2 style={{ margin: 0 }}>{t("settings.security")}</h2>
                            <p style={{ margin: 0, color: "#666" }}>{t("settings.securityHelp")}</p>
                            <div>
                                <Link href="/settings/login-logs">
                                    <Button variant="outlined">{t("settings.openLoginLogs")}</Button>
                                </Link>
                            </div>
                        </Paper>
                    )}
                    {canManageUsers && (
                        <Paper style={{ padding: "18px", display: "grid", gap: "10px" }}>
                            <h2 style={{ margin: 0 }}>{t("settings.userManagement")}</h2>
                            <p style={{ margin: 0, color: "#666" }}>{t("settings.userManagementHelp")}</p>
                            <div>
                                <Link href="/datos/usuarios">
                                    <Button variant="outlined">{t("settings.openUsers")}</Button>
                                </Link>
                            </div>
                        </Paper>
                    )}
                </div>
            </div>
        </MainPage>
    );
}

import Head from "next/head";
import Link from "next/link";

import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import styles from "@/styles/tablePage.module.css";

import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";


export default function Settings() {
    const access = useAccess();
    const canViewAdminLogs = Boolean(access.capabilities?.can_view_admin_logs);

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Settings</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Settings</h1>
                </div>
                <div style={{ display: "grid", gap: "12px", maxWidth: "760px", width: "90%" }}>
                    {canViewAdminLogs && (
                        <Paper style={{ padding: "18px", display: "grid", gap: "10px" }}>
                            <h2 style={{ margin: 0 }}>Security</h2>
                            <p style={{ margin: 0, color: "#666" }}>Review login, logout, and failed login activity.</p>
                            <div>
                                <Link href="/settings/login-logs">
                                    <Button variant="outlined">Open Login Logs</Button>
                                </Link>
                            </div>
                        </Paper>
                    )}
                </div>
            </div>
        </MainPage>
    );
}

import Head from "next/head";
import Link from "next/link";
import MainPage from "@/pages/mainPage";
import styles from "@/styles/tablePage.module.css";
import Button from "@mui/material/Button";


export default function Uploads() {
    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Uploads</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Uploads</h1>
                </div>
                <div style={{ maxWidth: "760px", display: "grid", gap: "16px" }}>
                    <p>
                        The import flow will parse MindBody reports, preview new and changed rows,
                        create missing lookup records, and keep raw history for audit.
                    </p>
                    <div>
                        <strong>Phase 1</strong>
                        <p>Create and clean the lookup tables used by imports.</p>
                        <Link href="/data">
                            <Button variant="outlined">Open Data Tables</Button>
                        </Link>
                    </div>
                    <div>
                        <strong>Phase 2</strong>
                        <p>Upload attendance, sales, and sales-by-service reports for validation and preview.</p>
                    </div>
                    <div>
                        <strong>Phase 3</strong>
                        <p>Confirm imports, upsert business records, and track row-level changes over time.</p>
                    </div>
                </div>
            </div>
        </MainPage>
    );
}

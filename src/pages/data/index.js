import Head from "next/head";
import Link from "next/link";
import MainPage from "@/pages/mainPage";
import { dataResourceList } from "@/constants/dataResources";
import styles from "@/styles/tablePage.module.css";
import Button from "@mui/material/Button";


export default function DataIndex() {
    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Data</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Data</h1>
                </div>
                <div style={{ display: "grid", gap: "12px", maxWidth: "720px" }}>
                    {dataResourceList.map((resource) => (
                        <Link href={`/data/${resource.key}`} key={resource.key}>
                            <Button variant="outlined" style={{ justifyContent: "flex-start", padding: "14px 16px" }}>
                                {resource.label}
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>
        </MainPage>
    );
}

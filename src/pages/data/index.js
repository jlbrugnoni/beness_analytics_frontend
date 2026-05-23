import Head from "next/head";
import Link from "next/link";
import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import { dataResourceList } from "@/constants/dataResources";
import styles from "@/styles/tablePage.module.css";
import Button from "@mui/material/Button";


const canSeeResource = (resource, access) => {
    if (access.has_global_access) return true;
    if (resource.visibility === "operator") return Boolean(access.capabilities?.can_upload_data);
    if (resource.visibility === "people") {
        const groupNames = (access.groups || []).map((group) => group.name);
        return Boolean(access.capabilities?.can_upload_data)
            || groupNames.includes("Manager")
            || groupNames.includes("Studio Manager");
    }
    return true;
};


export default function DataIndex() {
    const access = useAccess();
    const { t } = useI18n();
    const visibleResources = dataResourceList.filter((resource) => canSeeResource(resource, access));

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("data.title")}</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>{t("data.title")}</h1>
                </div>
                <div style={{ display: "grid", gap: "12px", maxWidth: "720px" }}>
                    {visibleResources.map((resource) => (
                        <Link href={`/data/${resource.key}`} key={resource.key}>
                            <Button variant="outlined" style={{ justifyContent: "flex-start", padding: "14px 16px" }}>
                                {t(`data.resources.${resource.key}`, resource.label)}
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>
        </MainPage>
    );
}

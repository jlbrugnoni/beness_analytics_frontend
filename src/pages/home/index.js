import Head from "next/head";
import MainPage from "../mainPage";
import styles from "@/styles/Home.module.css";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import useI18n from "@/hooks/useI18n";


export default function Home() {
    const userData = useFetchUserInfo();
    const { t } = useI18n();

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("home.title")}</title>
            </Head>
            <div className={styles.container}>
                <div>
                    <h1 className={styles.title}>{t("home.greeting")}, {userData.firstName}</h1>
                    <p>{t("home.subtitle")}</p>
                </div>
            </div>
        </MainPage>
    );
}

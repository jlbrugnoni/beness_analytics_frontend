import Head from "next/head";
import MainPage from "@/pages/mainPage";
import styles from "@/styles/Home.module.css";


export default function ModulePlaceholder({ title, description }) {
    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {title}</title>
            </Head>
            <div className={styles.container}>
                <div>
                    <h1 className={styles.title}>{title}</h1>
                    <p>{description}</p>
                </div>
            </div>
        </MainPage>
    );
}

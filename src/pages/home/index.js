import Head from "next/head";
import MainPage from "../mainPage";
import styles from "@/styles/Home.module.css";
import useFetchUserInfo from "@/components/useFetchUserInfo";


export default function Home() {
    const userData = useFetchUserInfo();

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Home</title>
            </Head>
            <div className={styles.container}>
                <div>
                    <h1 className={styles.title}>Hola, {userData.firstName}</h1>
                    <p>Beness Analytics platform base is ready.</p>
                </div>
            </div>
        </MainPage>
    );
}

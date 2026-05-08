import { use } from "react"
import LoginPage from "./loginPage";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {

  const router = useRouter();

  useEffect(() => {

    router.push("/loginPage");

  }, []);

  return (
    <>
      <h1>Cargando</h1>
    </>
  )
}



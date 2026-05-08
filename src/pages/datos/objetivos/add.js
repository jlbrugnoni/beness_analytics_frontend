import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import FormComponent from "@/components/FormComponent";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import Head from "next/head";

const AddObjective = () => {
    const router = useRouter();
    const token = useFetchToken();
    const userData = useFetchUserInfo();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!formData.name.trim()) {
            setError("El nombre del objetivo es obligatorio.");
            return;
        }

        try {
            await axios.post(
                `${backendUrl}/api/data/objectives/`,
                {
                    ...formData,
                    created_by: userData.email,
                },
                {
                    headers: { Authorization: `Token ${token}` },
                }
            );

            setSuccess(true);
            setTimeout(() => router.push("/datos/objetivos"), 2000);
        } catch (error) {
            setError(error.response?.data?.error || "Error al agregar el objetivo.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Añadir Objetivo</title>
            </Head>
            <FormComponent
                actionName='Añadir'
                entityName="Objetivo"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true },
                ]}
                initialData={{ name: "", description: "" }}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/objetivos")}
            />
        </MainPage>
    );
};

export default AddObjective;
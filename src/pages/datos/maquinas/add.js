import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";

const AddMachine = () => {
    const router = useRouter();
    const token = useFetchToken();
    const userData = useFetchUserInfo(); // Get logged-in user info
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!formData.name.trim()) {
            setError("El nombre de la máquina es obligatorio.");
            return;
        }

        try {
            await axios.post(
                `${backendUrl}/api/data/machines/`,
                {
                    ...formData,
                },
                {
                    headers: { Authorization: `Token ${token}` },
                }
            );

            setSuccess(true);
            setTimeout(() => router.push("/datos/maquinas"), 2000);
        } catch (error) {
            setError(error.response?.data?.error || "Error al agregar la máquina.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Añadir Máquina</title>
            </Head>
            <FormComponent
                actionName='Añadir'
                entityName="Máquina"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true },
                ]}
                initialData={{ name: "", description: "", image: "" }}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/maquinas")}
            />
        </MainPage>
    );
};

export default AddMachine;
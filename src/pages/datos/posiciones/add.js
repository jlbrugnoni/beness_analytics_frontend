import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";

const AddPosition = () => {
    const router = useRouter();
    const token = useFetchToken();
    const userData = useFetchUserInfo(); // Get logged-in user info
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!formData.name.trim()) {
            setError("El nombre de la posición es obligatorio.");
            return;
        }

        try {
            await axios.post(
                `${backendUrl}/api/data/positions/`,
                {
                    ...formData,
                    created_by: userData.email, // Assign created_by field
                },
                {
                    headers: { Authorization: `Token ${token}` },
                }
            );

            setSuccess(true);
            setTimeout(() => router.push("/datos/posiciones"), 2000);
        } catch (error) {
            setError(error.response?.data?.error || "Error al agregar la posición.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Añadir Posición</title>
            </Head>
            <FormComponent
                actionName='Añadir'
                entityName="Posición"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true },
                ]}
                initialData={{ name: "", description: "" }}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/posiciones")}
            />
        </MainPage>
    );
};

export default AddPosition;
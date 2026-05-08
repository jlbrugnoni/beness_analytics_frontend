import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import FormComponent from "@/components/FormComponent";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import Head from "next/head";

const EditObjective = () => {
    const router = useRouter();
    const { id } = router.query;
    const token = useFetchToken();
    const userData = useFetchUserInfo(); // Fetch logged-in user info
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    // Fetch objective details
    const fetchObjectiveData = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/objectives/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching objective:", error);
            throw new Error("No se pudo cargar la información del objetivo.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Editar Objetivo</title>
            </Head>
            <FormComponent
                actionName='Editar'
                entityName="Objetivo"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true }, // ✅ Multi-line support
                    { label: "Creado por", name: "created_by", disabled: true },
                ]}
                initialData={{
                    name: "",
                    description: "",
                    created_by: userData?.email || "N/A",
                }}
                fetchData={fetchObjectiveData}
                onSubmit={async (formData, setError, setSuccess) => {
                    if (!formData.name.trim()) {
                        setError("El nombre del objetivo es obligatorio.");
                        return;
                    }

                    try {
                        await axios.put(`${backendUrl}/api/data/objectives/${id}/`, formData, {
                            headers: { Authorization: `Token ${token}` },
                        });

                        setSuccess(true);
                        setTimeout(() => router.push("/datos/objetivos"), 2000);
                    } catch (error) {
                        setError(error.response?.data?.error || "Error al actualizar el objetivo.");
                    }
                }}
                onCancel={() => router.push("/datos/objetivos")}
            />
        </MainPage>
    );
};

export default EditObjective;

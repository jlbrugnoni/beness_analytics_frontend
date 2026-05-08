import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";

const EditPosition = () => {
    const router = useRouter();
    const { id } = router.query;
    const token = useFetchToken();
    const userData = useFetchUserInfo(); // ✅ Get logged-in user info
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    // Fetch position details for editing
    const fetchPositionData = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/positions/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });

            return {
                name: response.data.name || "",
                description: response.data.description || "",
                created_by: response.data.created_by || "N/A", // ✅ Ensure creator info is loaded
            };
        } catch (error) {
            console.error("Error fetching position:", error);
            throw new Error("No se pudo cargar la información de la posición.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Editar Posición</title>
            </Head>
            <FormComponent
                actionName='Editar'
                entityName="Posición"
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
                fetchData={fetchPositionData}
                onSubmit={async (formData, setError, setSuccess) => {
                    if (!formData.name.trim()) {
                        setError("El nombre de la posición es obligatorio.");
                        return;
                    }

                    try {
                        await axios.put(`${backendUrl}/api/data/positions/${id}/`, formData, {
                            headers: { Authorization: `Token ${token}` },
                        });

                        setSuccess(true);
                        setTimeout(() => router.push("/datos/posiciones"), 2000);
                    } catch (error) {
                        setError(error.response?.data?.error || "Error al actualizar la posición.");
                    }
                }}
                onCancel={() => router.push("/datos/posiciones")}
            />
        </MainPage>
    );
};

export default EditPosition;
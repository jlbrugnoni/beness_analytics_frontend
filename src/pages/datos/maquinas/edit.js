import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import FormComponent from "@/components/FormComponent";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import Head from "next/head";

const EditMachine = () => {
    const router = useRouter();
    const { id } = router.query;
    const token = useFetchToken();
    const userData = useFetchUserInfo(); // Fetch logged-in user info
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    // Fetch machine details for editing
    const fetchMachineData = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/machines/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching machine:", error);
            throw new Error("No se pudo cargar la información de la máquina.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Editar Máquina</title>
            </Head>
            <FormComponent
                actionName='Editar'
                entityName="Máquina"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true }, // ✅ Multi-line support enabled
                    { label: "Creado por", name: "created_by", disabled: true },
                ]}
                initialData={{
                    name: "",
                    description: "",
                    created_by: userData?.email || "N/A",
                }}
                fetchData={fetchMachineData}
                onSubmit={async (formData, setError, setSuccess) => {
                    if (!formData.name.trim()) {
                        setError("El nombre de la máquina es obligatorio.");
                        return;
                    }

                    try {
                        await axios.put(`${backendUrl}/api/data/machines/${id}/`, formData, {
                            headers: { Authorization: `Token ${token}` },
                        });

                        setSuccess(true);
                        setTimeout(() => router.push("/datos/maquinas"), 2000);
                    } catch (error) {
                        setError(error.response?.data?.error || "Error al actualizar la máquina.");
                    }
                }}
                onCancel={() => router.push("/datos/maquinas")}
            />
        </MainPage>
    );
};

export default EditMachine;
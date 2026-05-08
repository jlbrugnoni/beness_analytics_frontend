import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import FormComponent from "@/components/FormComponent";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import Head from "next/head";

const EditProp = () => {
    const router = useRouter();
    const { id } = router.query;
    const token = useFetchToken();
    const userData = useFetchUserInfo();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    // Fetch implemento (prop) details
    const fetchPropData = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/props/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching prop:", error);
            throw new Error("No se pudo cargar la información del implemento.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Editar Implemento</title>
            </Head>
            <FormComponent
                actionName='Editar'
                entityName="Implemento"
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
                fetchData={fetchPropData}
                onSubmit={async (formData, setError, setSuccess) => {
                    try {
                        await axios.put(`${backendUrl}/api/data/props/${id}/`, formData, {
                            headers: { Authorization: `Token ${token}` },
                        });

                        setSuccess(true);
                        setTimeout(() => router.push("/datos/implementos"), 2000);
                    } catch (error) {
                        setError(error.response?.data?.error || "Error al actualizar el implemento.");
                    }
                }}
                onCancel={() => router.push("/datos/implementos")}
            />
        </MainPage>
    );
};

export default EditProp;
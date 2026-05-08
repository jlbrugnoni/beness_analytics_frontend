import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";

const AddProp = () => {
    const router = useRouter();
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleSubmit = async (formData, setError, setSuccess) => {
        try {
            await axios.post(`${backendUrl}/api/data/props/`, formData, {
                headers: { Authorization: `Token ${token}` },
            });
            setSuccess(true);
            setTimeout(() => router.push("/datos/implementos"), 2000);
        } catch (error) {
            setError(error.response?.data?.error || "Error al agregar el implemento.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Añadir Implemento</title>
            </Head>
            <FormComponent
                actionName='Añadir'
                entityName="Implemento"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true },
                ]}
                initialData={{ name: "", description: "" }}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/implementos")}
            />
        </MainPage>
    );
};

export default AddProp;
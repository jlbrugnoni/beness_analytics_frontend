
import MainPage from "@/pages/mainPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import FormComponent from "@/components/FormComponent";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import Head from "next/head";

export default function AddRoutine() {
    const router = useRouter();
    const token = useFetchToken();
    const userData = useFetchUserInfo();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [machines, setMachines] = useState([]);
    const [props, setProps] = useState([]);
    const [tags, setTags] = useState([]);
    useEffect(() => {
        const fetchMachinesTagsAndProps = async () => {
            try {
                const [machinesRes, propsRes, tagsRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/data/all_machines/`, {
                        headers: { Authorization: `Token ${token}` },
                    }),
                    axios.get(`${backendUrl}/api/data/all_props/`, {
                        headers: { Authorization: `Token ${token}` },
                    }),
                    axios.get(`${backendUrl}/api/data/all_tags/`, { headers: { Authorization: `Token ${token}` } })
                ]);

                setMachines(machinesRes.data || []);
                setProps(propsRes.data || []);
                setTags(tagsRes.data || []);
            } catch (error) {
                console.error("Error fetching machines and props:", error);
            }
        };

        if (token) fetchMachinesTagsAndProps();
    }, [token]);

    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!formData.name.trim()) {
            setError("El nombre de la clase es obligatorio.");
            return;
        }

        try {
            const requestData = {
                ...formData,
                created_by: userData.email, // ✅ Keep created_by as email
                on_edit: true, // Routine starts as editable                
                machines: formData.machines || [],
                prop: formData.prop || null, // ✅ Send prop name instead of ID
            };

            await axios.post(`${backendUrl}/api/data/routines/`, requestData, {
                headers: { Authorization: `Token ${token}` },
            });

            setSuccess(true);
            setTimeout(() => router.push("/clases"), 2000);
        } catch (error) {
            console.error("Error creating routine:", error.response?.data);
            setError(error.response?.data?.error || "Error al agregar la clase.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Añadir Clase</title>
            </Head>
            <FormComponent
                actionName="Añadir"
                entityName="Clase"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true },
                    { label: "Duración (minutos)", name: "duration", type: "number" },
                    {
                        label: "Máquinas",
                        name: "machines",
                        type: "multiselect",
                        options: machines.map((m) => ({ label: m.name, value: m.id })),
                    },
                    {
                        label: "Implemento",
                        name: "prop",
                        type: "select",
                        options: [{ value: "" }, ...props.map((p) => ({ label: p.name, value: p.name }))], // ✅ Placeholder option
                    },
                    {
                        label: "Etiquetas",
                        name: "tags",
                        type: "multiselect",
                        options: tags.map((m) => ({ label: m.name, value: m.id })),
                    },

                ]}
                initialData={{ name: "", description: "", duration: "", machine: "", prop: "" }} // ✅ Ensures initial state is empty
                onSubmit={handleSubmit}
                onCancel={() => router.push("/clases")}
                showMediaUpload={false} // ✅ Hide media upload section
            />
        </MainPage>
    );
}
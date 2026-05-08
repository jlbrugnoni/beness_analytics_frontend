import MainPage from "@/pages/mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import FormComponent from "@/components/FormComponent";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import { useState, useEffect } from "react";
import Head from "next/head";

const EditRoutine = () => {
    const router = useRouter();
    const { id } = router.query;
    const token = useFetchToken();
    const userData = useFetchUserInfo();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [machines, setMachines] = useState([]);
    const [props, setProps] = useState([]);
    const [tags, setTags] = useState([]);

    const [initialData, setInitialData] = useState({
        name: "",
        description: "",
        duration: "",
        machines: [],
        prop: "",
        created_by: userData?.email || "N/A",
        on_edit: false,
    });

    // Fetch routine details
    const fetchRoutineData = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/routines/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            setInitialData({
                name: response.data.name,
                description: response.data.description,
                duration: response.data.duration,
                machines: response.data.machines || [],
                prop: response.data.prop,
                created_by: response.data.created_by,
                on_edit: response.data.on_edit,
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching routine:", error);
            throw new Error("No se pudo cargar la información de la clase.");
        }
    };

    // Fetch machines and props for dropdowns
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

    return (
        <MainPage>
            <Head>
                <title>Beness App | Editar Clase</title>
            </Head>
            <FormComponent
                actionName="Editar"
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
                        options: props.map((p) => ({ label: p.name, value: p.name })), // ✅ Send name instead of ID
                    },
                    {
                        label: "Etiquetas",
                        name: "tags",
                        type: "multiselect",
                        options: tags.map((m) => ({ label: m.name, value: m.id })),
                    },
                    { label: "Creado por", name: "created_by", disabled: true },
                    { label: "Clase en Edición", name: "on_edit", type: "boolean" },
                ]}
                initialData={initialData}
                fetchData={fetchRoutineData}
                onSubmit={async (formData, setError, setSuccess) => {
                    if (!formData.name.trim()) {
                        setError("El nombre de la clase es obligatorio.");
                        return;
                    }

                    try {
                        const requestData = {
                            ...formData,
                            machines: formData.machines,
                            prop: formData.prop || null, // ✅ Send name instead of ID
                        };

                        await axios.put(`${backendUrl}/api/data/routines/${id}/`, requestData, {
                            headers: { Authorization: `Token ${token}` },
                        });

                        setSuccess(true);
                        setTimeout(() => router.push("/clases"), 2000);
                    } catch (error) {
                        console.error("Error updating routine:", error.response?.data);
                        setError(error.response?.data?.error || "Error al actualizar la clase.");
                    }
                }}
                onCancel={() => router.push("/clases")}
                showMediaUpload={false}
            />

        </MainPage>
    );
};

export default EditRoutine;



{/* <FormComponent
                actionName="Editar"
                entityName="Clase"
                fields={[
                    { label: "Nombre", name: "name" },
                    { label: "Descripción", name: "description", multiline: true },
                    { label: "Duración (minutos)", name: "duration", type: "number" },
                    {
                        label: "Máquina",
                        name: "machine",
                        type: "select",
                        options: machines.map((m) => ({ label: m.name, value: m.name })), // ✅ Send name instead of ID
                    },
                    {
                        label: "Implemento",
                        name: "prop",
                        type: "select",
                        options: props.map((p) => ({ label: p.name, value: p.name })), // ✅ Send name instead of ID
                    },
                    { label: "Creado por", name: "created_by", disabled: true },
                    { label: "Clase en Edición", name: "on_edit", type: "boolean" }, // ✅ Boolean switch field
                ]}
                initialData={initialData}
                fetchData={fetchRoutineData}
                onSubmit={async (formData, setError, setSuccess) => {
                    if (!formData.name.trim()) {
                        setError("El nombre de la clase es obligatorio.");
                        return;
                    }

                    try {
                        const requestData = {
                            ...formData,
                            machine: formData.machine || null, // ✅ Send name instead of ID
                            prop: formData.prop || null, // ✅ Send name instead of ID
                        };

                        await axios.put(`${backendUrl}/api/data/routines/${id}/`, requestData, {
                            headers: { Authorization: `Token ${token}` },
                        });

                        setSuccess(true);
                        setTimeout(() => router.push("/clases"), 2000);
                    } catch (error) {
                        console.error("Error updating routine:", error.response?.data);
                        setError(error.response?.data?.error || "Error al actualizar la clase.");
                    }
                }}
                onCancel={() => router.push("/clases")}
                showMediaUpload={false} // ✅ Hide media upload section
            /> */}
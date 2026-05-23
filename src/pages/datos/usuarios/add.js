import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";


const capabilityFields = [
    { label: "Can View Money", name: "can_view_money", type: "boolean" },
    { label: "Can Upload Data", name: "can_upload_data", type: "boolean" },
    { label: "Can Edit Data", name: "can_edit_data", type: "boolean" },
    { label: "Can Reset Data", name: "can_reset_data", type: "boolean" },
    { label: "Can Manage Users", name: "can_manage_users", type: "boolean" },
    { label: "Can View Admin Logs", name: "can_view_admin_logs", type: "boolean" },
];


const emptyAccessData = {
    groups: [],
    allowed_sites: [],
    allowed_studios: [],
    can_view_money: false,
    can_upload_data: false,
    can_edit_data: false,
    can_reset_data: false,
    can_manage_users: false,
    can_view_admin_logs: false,
};


const UserCreatePage = () => {
    const router = useRouter();
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [availableGroups, setAvailableGroups] = useState([]);
    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    useEffect(() => {
        const fetchAccessLookups = async () => {
            try {
                const [groupsResponse, sitesResponse, studiosResponse] = await Promise.all([
                    axios.get(`${backendUrl}/api/data/groups/`, authHeaders),
                    axios.get(`${backendUrl}/api/data/sites/`, authHeaders),
                    axios.get(`${backendUrl}/api/data/studios/`, authHeaders),
                ]);
                setAvailableGroups(groupsResponse.data);
                setSites(sitesResponse.data.results || sitesResponse.data);
                setStudios(studiosResponse.data.results || studiosResponse.data);
            } catch (err) {
                console.error("Error fetching access lookups", err);
            }
        };

        if (token) fetchAccessLookups();
    }, [token]);

    const validateForm = (formData, setError) => {
        if (formData.password !== formData.password2) {
            setError("Las contraseñas no coinciden.");
            return false;
        }
        return true;
    };

    const saveAccessProfile = async (userId, formData) => {
        await axios.post(`${backendUrl}/api/data/user-access-profiles/`, {
            user: userId,
            allowed_sites: formData.allowed_sites || [],
            allowed_studios: formData.allowed_studios || [],
            can_view_money: Boolean(formData.can_view_money),
            can_upload_data: Boolean(formData.can_upload_data),
            can_edit_data: Boolean(formData.can_edit_data),
            can_reset_data: Boolean(formData.can_reset_data),
            can_manage_users: Boolean(formData.can_manage_users),
            can_view_admin_logs: Boolean(formData.can_view_admin_logs),
        }, authHeaders);
    };

    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!validateForm(formData, setError)) return;

        try {
            const response = await axios.post(`${backendUrl}/api/data/users/`, {
                first_name: formData.first_name,
                last_name: formData.last_name,
                username: formData.username,
                email: formData.email,
                image: formData.image,
                groups: formData.groups || [],
                password: formData.password,
            }, authHeaders);
            await saveAccessProfile(response.data.id, formData);

            setSuccess(true);
            setTimeout(() => router.push("/datos/usuarios"), 2000);
        } catch (error) {
            setError(error.response?.data?.error || "Error al crear usuario.");
        }
    };

    const groupOptions = availableGroups.map((group) => ({ value: group.id, label: group.name }));
    const siteOptions = sites.map((site) => ({ value: site.id, label: site.name }));
    const studioOptions = studios.map((studio) => ({
        value: studio.id,
        label: `${studio.site_name || "Site"} - ${studio.name}`,
    }));

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Añadir Usuario</title>
            </Head>
            <FormComponent
                actionName="Añadir"
                entityName="Usuario"
                fields={[
                    { label: "Nombre", name: "first_name" },
                    { label: "Apellido", name: "last_name" },
                    { label: "Nombre de Usuario", name: "username" },
                    { label: "Correo Electronico", name: "email", type: "email" },
                    { label: "Groups", name: "groups", type: "multiselect", options: groupOptions },
                    { label: "Allowed Sites", name: "allowed_sites", type: "multiselect", options: siteOptions },
                    { label: "Allowed Studios", name: "allowed_studios", type: "multiselect", options: studioOptions },
                    ...capabilityFields,
                    { label: "Contraseña", name: "password", type: "password" },
                    { label: "Repetir Contraseña", name: "password2", type: "password" },
                ]}
                initialData={{
                    first_name: "",
                    last_name: "",
                    username: "",
                    email: "",
                    password: "",
                    password2: "",
                    ...emptyAccessData,
                }}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/usuarios")}
            />
        </MainPage>
    );
};

export default UserCreatePage;

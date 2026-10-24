import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { languages } from "@/i18n/translations";
import useI18n from "@/hooks/useI18n";
import AccessSummary from "@/components/AccessSummary";
import { fetchApiRows } from "@/utils/fetchApiRows";
import { capabilityFormFields, emptyFinanceCapabilities, financeCapabilityValues } from "@/constants/accessCapabilities";


const emptyAccessData = {
    ...emptyFinanceCapabilities,
    language: "en",
    allowed_sites: [],
    allowed_studios: [],
    can_view_money: false,
    can_upload_data: false,
    can_edit_data: false,
    can_reset_data: false,
    can_manage_users: false,
    can_view_admin_logs: false,
};


const EditUserPage = () => {
    const { t } = useI18n();
    const router = useRouter();
    const token = useFetchToken();
    const loggedInUser = useFetchUserInfo();
    const { id } = router.query;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [availableGroups, setAvailableGroups] = useState([]);
    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [profileRevision, setProfileRevision] = useState(null);
    const [effectiveAccess, setEffectiveAccess] = useState(null);
    const canChangePassword = loggedInUser?.is_staff || loggedInUser?.id == id;

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    useEffect(() => {
        const fetchAccessLookups = async () => {
            try {
                const [groupsResponse, sitesResponse, studiosResponse] = await Promise.all([
                    axios.get(`${backendUrl}/api/data/groups/`, authHeaders),
                    fetchApiRows(`${backendUrl}/api/data/sites/`, authHeaders, backendUrl),
                    fetchApiRows(`${backendUrl}/api/data/studios/`, authHeaders, backendUrl),
                ]);
                setAvailableGroups(groupsResponse.data);
                setSites(sitesResponse);
                setStudios(studiosResponse);
            } catch (err) {
                console.error("Error fetching access lookups", err);
            }
        };

        if (token) fetchAccessLookups();
    }, [token, authHeaders, backendUrl]);

    const fetchUserData = async () => {
        if (!id) return {};
        const [userResponse, accessResponse] = await Promise.all([
            axios.get(`${backendUrl}/api/data/users/${id}/`, authHeaders),
            axios.get(`${backendUrl}/api/data/user-access-profiles/?user=${id}`, authHeaders),
        ]);
        const profile = (accessResponse.data.results || accessResponse.data)[0] || {};
        setProfileRevision(profile.revision || null);
        setEffectiveAccess(profile.effective_access || null);

        return {
            ...financeCapabilityValues(profile),
            first_name: userResponse.data.first_name || "",
            last_name: userResponse.data.last_name || "",
            username: userResponse.data.username || "",
            email: userResponse.data.email || "",
            groups: userResponse.data.groups || [],
            image: userResponse.data.image || "",
            new_password: "",
            confirm_password: "",
            language: profile.language || "en",
            allowed_sites: profile.allowed_sites || [],
            allowed_studios: profile.allowed_studios || [],
            can_view_money: Boolean(profile.can_view_money),
            can_upload_data: Boolean(profile.can_upload_data),
            can_edit_data: Boolean(profile.can_edit_data),
            can_reset_data: Boolean(profile.can_reset_data),
            can_manage_users: Boolean(profile.can_manage_users),
            can_view_admin_logs: Boolean(profile.can_view_admin_logs),
        };
    };

    const validateForm = (formData, setError) => {
        if (canChangePassword && formData.new_password && formData.new_password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return false;
        }
        if (canChangePassword && formData.new_password !== formData.confirm_password) {
            setError("Las contraseñas no coinciden.");
            return false;
        }
        return true;
    };

    const buildAccessProfile = (formData) => ({
            ...financeCapabilityValues(formData),
            ...(profileRevision ? { expected_revision: profileRevision } : {}),
            user: Number(id),
            language: formData.language || "en",
            allowed_sites: formData.allowed_sites || [],
            allowed_studios: formData.allowed_studios || [],
            can_view_money: Boolean(formData.can_view_money),
            can_upload_data: Boolean(formData.can_upload_data),
            can_edit_data: Boolean(formData.can_edit_data),
            can_reset_data: Boolean(formData.can_reset_data),
            can_manage_users: Boolean(formData.can_manage_users),
            can_view_admin_logs: Boolean(formData.can_view_admin_logs),
        });

    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!validateForm(formData, setError)) return false;

        const userPayload = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            username: formData.username,
            email: formData.email,
            image: formData.image,
            groups: formData.groups || [],
            access_profile: buildAccessProfile(formData),
        };
        if (canChangePassword && formData.new_password) {
            userPayload.password = formData.new_password;
        }

        try {
            await axios.put(`${backendUrl}/api/data/users/${id}/`, userPayload, authHeaders);

            setSuccess(true);
            setTimeout(() => router.push("/datos/usuarios"), 2000);
        } catch (error) {
            setError(error.response?.data?.detail || error.response?.data?.error || "Error al actualizar usuario.");
            return false;
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
                <title>Beness Analytics | Editar Usuario</title>
            </Head>
            <FormComponent
                actionName="Editar"
                entityName="Usuario"
                fields={[
                    { label: "Correo Electronico", name: "email", type: "email", disabled: true },
                    { label: "Nombre", name: "first_name" },
                    { label: "Apellido", name: "last_name" },
                    { label: "Nombre de Usuario", name: "username" },
                    { label: "Language", name: "language", type: "select", options: languages },
                    { label: "Groups", name: "groups", type: "multiselect", options: groupOptions },
                    { label: "Allowed Sites", name: "allowed_sites", type: "multiselect", options: siteOptions },
                    { label: "Allowed Studios", name: "allowed_studios", type: "multiselect", options: studioOptions },
                    ...capabilityFormFields(t),
                    ...(canChangePassword
                        ? [
                            { label: "Nueva Contraseña (Opcional)", name: "new_password", type: "password" },
                            { label: "Confirmar Nueva Contraseña", name: "confirm_password", type: "password" },
                        ]
                        : []),
                ]}
                initialData={{
                    first_name: "",
                    last_name: "",
                    username: "",
                    email: "",
                    groups: [],
                    new_password: "",
                    confirm_password: "",
                    ...emptyAccessData,
                }}
                fetchData={fetchUserData}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/usuarios")}
            />
            <AccessSummary access={effectiveAccess} />
        </MainPage>
    );
};

export default EditUserPage;

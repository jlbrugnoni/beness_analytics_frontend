import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";
import { useEffect, useState } from "react";

const EditUserPage = () => {
    const router = useRouter();
    const token = useFetchToken();
    const loggedInUser = useFetchUserInfo();
    const { id } = router.query;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [availableGroups, setAvailableGroups] = useState([]);
    // Check if logged-in user can change the password
    const canChangePassword = loggedInUser?.is_staff || loggedInUser?.id == id;

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/data/groups/`, {
                    headers: { Authorization: `Token ${token}` },
                });
                setAvailableGroups(response.data);
            } catch (err) {
                console.error("Error fetching groups", err);
            }
        };

        if (token) fetchGroups();
    }, [token]);

    // Fetch User Data for Editing
    const fetchUserData = async () => {
        const response = await axios.get(`${backendUrl}/api/data/users/${id}/`, {
            headers: { Authorization: `Token ${token}` },
        });

        const userData = {
            first_name: response.data.first_name || "",
            last_name: response.data.last_name || "",
            username: response.data.username || "",
            email: response.data.email || "",
            groups: response.data.groups?.[0]?.toString() || "",
            image: response.data.image || "",
            new_password: "",
            confirm_password: "",
        };
        return userData;
    };

    // Validate Passwords Before Updating
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

    // Handle User Update
    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!validateForm(formData, setError)) return;

        const userPayload = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            username: formData.username,
            email: formData.email,
            image: formData.image,
            groups: formData.groups ? [formData.groups] : []
        };
        console.log("Voy a mandar " + JSON.stringify(userPayload, null, 4));
        if (canChangePassword && formData.new_password) {
            userPayload.password = formData.new_password;
        }

        try {
            await axios.put(`${backendUrl}/api/data/users/${id}/`, userPayload, {
                headers: { Authorization: `Token ${token}` },
            });

            setSuccess(true);
            setTimeout(() => router.push("/datos/usuarios"), 2000);
        } catch (error) {
            setError(error.response?.data?.error || "Error al actualizar usuario.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Editar Usuario</title>
            </Head>
            <FormComponent
                actionName='Editar'
                entityName="Usuario"
                fields={[
                    { label: "Correo Electrónico", name: "email", type: "email" },
                    { label: "Nombre", name: "first_name" },
                    { label: "Apellido", name: "last_name" },
                    { label: "Nombre de Usuario", name: "username" },
                    {
                        label: "Grupo",
                        name: "groups",
                        type: "select",
                        options: availableGroups.map(g => ({ value: g.id.toString(), label: g.name }))
                    },
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
                    groups: "",
                    new_password: "",
                    confirm_password: "",
                }}
                fetchData={fetchUserData}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/usuarios")}
                disableFields={["email"]} // Prevent email editing
            />
        </MainPage>
    );
};

export default EditUserPage;
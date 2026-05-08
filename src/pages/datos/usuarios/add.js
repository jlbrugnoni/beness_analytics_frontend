import MainPage from "../../mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import FormComponent from "@/components/FormComponent";
import Head from "next/head";
import { useEffect, useState } from "react";
const UserCreatePage = () => {
    const router = useRouter();
    const token = useFetchToken();
    const userData = useFetchUserInfo(); // Get logged-in user info
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [availableGroups, setAvailableGroups] = useState([]);
    const [initialData, setInitialData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        groups: "",
        password: "",
        password2: "",
    });
    // Validate Passwords Before Submitting
    const validateForm = (formData, setError) => {
        if (formData.password !== formData.password2) {
            setError("Las contraseñas no coinciden.");
            return false;
        }
        return true;
    };
    useEffect(() => {
        if (availableGroups.length > 0) {
            setInitialData(prev => ({
                ...prev,
                groups: availableGroups[0].id.toString()
            }));
        }
    }, [availableGroups]);
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

    // Handle User Creation
    const handleSubmit = async (formData, setError, setSuccess) => {
        if (!validateForm(formData, setError)) return;

        try {
            const userPayload = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                username: formData.username,
                email: formData.email,
                image: formData.image,
                groups: formData.groups ? [parseInt(formData.groups)] : [],
                password: formData.password,
            };

            await axios.post(`${backendUrl}/api/data/users/`, userPayload, {
                headers: { Authorization: `Token ${token}` },
            });

            setSuccess(true);
            setTimeout(() => router.push("/datos/usuarios"), 2000);
        } catch (error) {
            setError(error.response?.data?.error || "Error al crear usuario.");
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Añadir Usuario</title>
            </Head>
            <FormComponent
                actionName='Añadir'
                entityName="Usuario"
                fields={[
                    { label: "Nombre", name: "first_name" },
                    { label: "Apellido", name: "last_name" },
                    { label: "Nombre de Usuario", name: "username" },
                    { label: "Correo Electrónico", name: "email", type: "email" },
                    {
                        label: "Grupo",
                        name: "groups",
                        type: "select",
                        options: availableGroups.map(g => ({ value: g.id.toString(), label: g.name }))
                    },
                    { label: "Contraseña", name: "password", type: "password" },
                    { label: "Repetir Contraseña", name: "password2", type: "password" },
                ]}
                initialData={{
                    first_name: "",
                    last_name: "",
                    username: "",
                    email: "",
                    groups: availableGroups.length > 0 ? availableGroups[0].id.toString() : "",
                    password: "",
                    password2: "",
                }}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/datos/usuarios")}
            />
        </MainPage>
    );
};

export default UserCreatePage;

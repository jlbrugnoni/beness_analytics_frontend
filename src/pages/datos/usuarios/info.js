import MainPage from "../../mainPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";

import styles from "@/styles/infoPage.module.css";
import { Button, Card, CardContent, Typography, CircularProgress, Chip, Stack } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

import useFetchToken from "@/components/useFetchUserId";

import Head from "next/head";

export default function UserInfoPage() {
    const router = useRouter();
    const token = useFetchToken();
    const { id } = router.query; // Get user ID from URL

    const [user, setUser] = useState(null);
    const [accessProfile, setAccessProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const headers = { "Authorization": `Token ${token}` };
                const [userResponse, accessResponse] = await Promise.all([
                    axios.get(`${backendUrl}/api/data/users/${id}/`, { headers }),
                    axios.get(`${backendUrl}/api/data/user-access-profiles/?user=${id}`, { headers }),
                ]);
                setUser(userResponse.data);
                setAccessProfile((accessResponse.data.results || accessResponse.data)[0] || null);
            } catch (error) {
                setError("Error fetching user information");
            } finally {
                setLoading(false);
            }
        };

        if (id && token) fetchUserData();
    }, [id, token]);

    const capabilityLabels = [
        ["can_view_money", "View Money"],
        ["can_upload_data", "Upload Data"],
        ["can_edit_data", "Edit Data"],
        ["can_reset_data", "Reset Data"],
        ["can_manage_users", "Manage Users"],
        ["can_view_admin_logs", "View Admin Logs"],
    ];

    return (
        <MainPage>
            <Head>
                <title>Beness App | Info Usuario</title>
            </Head>
            <div className={styles.container}>
                <h1 className={styles.title}>Información del Usuario</h1>

                {loading ? (
                    <CircularProgress />
                ) : error ? (
                    <p className={styles.error}>{error}</p>
                ) : (
                    <Card className={styles.card}>
                        <CardContent>

                            <Typography variant="h6" className={styles.infoLabel}>Nombre:</Typography>
                            <Typography variant="body1">{user.first_name} {user.last_name}</Typography>

                            <Typography variant="h6" className={styles.infoLabel}>Nombre de Usuario:</Typography>
                            <Typography variant="body1">{user.username}</Typography>

                            <Typography variant="h6" className={styles.infoLabel}>Correo Electrónico:</Typography>
                            <Typography variant="body1">{user.email}</Typography>

                            <Typography variant="h6" className={styles.infoLabel}>Estado:</Typography>
                            <Typography variant="body1">
                                {user.is_active ? "Activo" : "Inactivo"}
                            </Typography>

                            <Typography variant="h6" className={styles.infoLabel}>Roles:</Typography>
                            <Typography variant="body1">
                                {user.is_superuser ? "Superusuario" : user.is_staff ? "Administrador" : "Usuario Regular"}
                            </Typography>

                            <Typography variant="h6" className={styles.infoLabel}>Groups:</Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                {(user.group_names || []).length ? (
                                    (user.group_names || []).map((groupName) => (
                                        <Chip key={groupName} label={groupName} size="small" />
                                    ))
                                ) : (
                                    <Typography variant="body1">No groups assigned</Typography>
                                )}
                            </Stack>

                            <Typography variant="h6" className={styles.infoLabel}>Allowed Sites:</Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                {accessProfile?.allowed_site_names?.length ? (
                                    accessProfile.allowed_site_names.map((siteName) => (
                                        <Chip key={siteName} label={siteName} size="small" />
                                    ))
                                ) : (
                                    <Typography variant="body1">No explicit sites</Typography>
                                )}
                            </Stack>

                            <Typography variant="h6" className={styles.infoLabel}>Allowed Studios:</Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                {accessProfile?.allowed_studio_names?.length ? (
                                    accessProfile.allowed_studio_names.map((studioName) => (
                                        <Chip key={studioName} label={studioName} size="small" />
                                    ))
                                ) : (
                                    <Typography variant="body1">No explicit studios</Typography>
                                )}
                            </Stack>

                            <Typography variant="h6" className={styles.infoLabel}>Capabilities:</Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                {capabilityLabels.map(([key, label]) => (
                                    <Chip
                                        key={key}
                                        label={label}
                                        size="small"
                                        color={accessProfile?.[key] ? "success" : "default"}
                                        variant={accessProfile?.[key] ? "filled" : "outlined"}
                                    />
                                ))}
                            </Stack>

                            <Typography variant="h6" className={styles.infoLabel}>Fecha de Registro:</Typography>
                            <Typography variant="body1">{new Date(user.date_joined).toLocaleDateString()}</Typography>
                        </CardContent>
                    </Card>
                )}

                <div className={styles.buttonContainer}>
                    <Button
                        variant="contained"
                        className={styles.editButton}
                        startIcon={<EditIcon />}
                        onClick={() => router.push(`/datos/usuarios/edit?id=${id}`)}
                    >
                        Editar Usuario
                    </Button>

                    <Button
                        variant="outlined"
                        className={styles.backButton}
                        onClick={() => router.push("/datos/usuarios")}
                    >
                        Volver
                    </Button>
                </div>
            </div>
        </MainPage>
    );
}

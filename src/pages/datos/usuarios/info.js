import MainPage from "../../mainPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";

import styles from "@/styles/infoPage.module.css";
import { Button, Card, CardContent, Typography, CircularProgress } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

import useFetchToken from "@/components/useFetchUserId";

import Head from "next/head";

export default function UserInfoPage() {
    const router = useRouter();
    const token = useFetchToken();
    const { id } = router.query; // Get user ID from URL

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/data/users/${id}/`, {
                    headers: { "Authorization": `Token ${token}` },
                });
                setUser(response.data);
            } catch (error) {
                setError("Error fetching user information");
            } finally {
                setLoading(false);
            }
        };

        if (id && token) fetchUserData();
    }, [id, token]);

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
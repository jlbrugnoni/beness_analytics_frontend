import styles from "../styles/Principal.module.css";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import menuIcon from "../images/menu-icon.png";
import HomeIcon from "@mui/icons-material/Home";
import EjerciciosIcon from "@mui/icons-material/SportsGymnastics";
// import datosIcon from "../images/menu-icon.png";
import benessLogo from "../images/beness-logo.png";
import StorageIcon from "@mui/icons-material/Storage";
import ClassIcon from "@mui/icons-material/ConnectedTv";
import Event from "@mui/icons-material/Event";

import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import usePermissions from "@/hooks/usePermissions";
import routePermissions from "@/constants/routePermissions";
export default function MainPage({ children }) {
    const router = useRouter();

    const [openDatos, setOpenDatos] = useState(false);
    const [openClases, setOpenClases] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [navVisible, setNavVisible] = useState(false);
    const [validToken, setValidToken] = useState(false);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [showPage, setShowPage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionsChecked, setPermissionsChecked] = useState(false);
    const permissions = usePermissions();
    useEffect(() => {
        if (typeof window !== "undefined") {
            const token = sessionStorage.getItem("token");
            if (!token) {
                router.push("/loginPage");
            } else {
                const validateToken = async () => {
                    try {
                        const response = await axios.post(`${backendUrl}/api/data/validate-token`, {
                            token: token,
                        });
                        setValidToken(response.data.valid);
                        if (response.data.valid) {
                            setShowPage(true);
                        } else {
                            router.push("/loginPage");
                        }
                    } catch (error) {
                        console.error("Token validation error:", error);
                        router.push("/loginPage");
                    }
                    finally {
                        setIsLoading(false);
                    }
                };
                validateToken();
            }
        }
    }, []);

    useEffect(() => {
        if (router.pathname.startsWith("/ejercicios")) {
            setSelectedIndex("ejercicios");
        } else if (router.pathname.startsWith("/datos/objetivos")) {
            setSelectedIndex("objetivos");
            setOpenDatos(true);
        } else if (router.pathname.startsWith("/datos/posiciones")) {
            setSelectedIndex("posiciones");
            setOpenDatos(true);
        } else if (router.pathname.startsWith("/datos/implementos")) {
            setSelectedIndex("implementos");
            setOpenDatos(true);
        } else if (router.pathname.startsWith("/datos/maquinas")) {
            setSelectedIndex("maquinas");
            setOpenDatos(true);
        } else if (router.pathname.startsWith("/datos/usuarios")) {
            setSelectedIndex("usuarios");
            setOpenDatos(true);
        } else if (router.pathname.startsWith("/clases")) {
            setSelectedIndex("clases");
        } else {
            setSelectedIndex(null);
        }
    }, [router.pathname]);

    useEffect(() => {
        if (!permissions) return;

        const cleanPath = router.asPath.split("?")[0];
        const matchedPath = Object.keys(routePermissions)
            .sort((a, b) => b.length - a.length)
            .find((path) => cleanPath.startsWith(path));

        const requiredPermission = matchedPath ? routePermissions[matchedPath] : null;
        if (requiredPermission && !permissions.includes(requiredPermission)) {
            router.push("/home");
        } else {
            setPermissionsChecked(true);
        }
    }, [permissions, router.asPath]);

    if (isLoading || !showPage || !permissions || !permissionsChecked) {
        return null;
    }

    const toggleNav = () => {
        setNavVisible(!navVisible);
    };

    const deployDatos = () => {
        setOpenDatos(!openDatos);
    };

    const deployClases = () => {
        setOpenClases(!openClases);
    };

    const handleLogout = () => {
        router.push("/loginPage");
        console.log(`token: ${sessionStorage.getItem("token")}`);
        try {
            axios.post(`${backendUrl}/api/data/logout`, {}, {
                headers: { Authorization: `Token ${sessionStorage.getItem("token")}` },
            });
        } catch (error) {
            console.error("Logout error:", error);
        }
        sessionStorage.clear();
    };
    return (
        <>
            <header className={styles.header}>
                <Image
                    src={menuIcon}
                    alt="Menu Icon"
                    className={styles.menuIcon}
                    onClick={toggleNav}
                />
                <Image src={benessLogo} alt="Company Logo" className={styles.logo} onClick={() => router.push(`/home`)} />
                {router.pathname !== "/sessions" && (
                    <Button className={styles.logoutButton} onClick={handleLogout}>
                        Cerrar Sesión
                    </Button>
                )}
            </header>

            <div className={`${styles.container} ${navVisible ? styles.navVisible : ""}`}>
                <List component="nav" className={styles.nav}>


                    {/* --- HOME --- */}
                    <Link href="/home">
                        <ListItemButton selected={selectedIndex === "home"}>
                            <ListItemIcon>
                                <HomeIcon style={{ color: "var(--beness-gris-oscuro)" }} />
                            </ListItemIcon>
                            <ListItemText primary="Home" />
                        </ListItemButton>
                    </Link>

                    {/* --- NEW SERIES SESSIONS --- */}
                    {permissions.includes("core_data.view_sessionseries") &&
                        <Link href="/sessionsseries">
                            <ListItemButton selected={selectedIndex === "sessionsseries"}>
                                <ListItemIcon>
                                    <Event style={{ color: "var(--beness-gris-oscuro)" }} />
                                </ListItemIcon>
                                <ListItemText primary="Planificación" />
                            </ListItemButton>
                        </Link>
                    }

                    {/* --- SESSIONS --- */}
                    {permissions.includes("core_data.view_routinesession") &&
                        <Link href="/sessions">
                            <ListItemButton selected={selectedIndex === "sessions"}>
                                <ListItemIcon>
                                    <ClassIcon style={{ color: "var(--beness-gris-oscuro)" }} />
                                </ListItemIcon>
                                <ListItemText primary="Sesiones" />
                            </ListItemButton>
                        </Link>
                    }

                    {/* --- CLASES --- */}
                    {permissions.includes("core_data.view_routine") &&
                        <Link href="/clases">
                            <ListItemButton selected={selectedIndex === "clases"}>
                                <ListItemIcon>
                                    <ClassIcon style={{ color: "var(--beness-gris-oscuro)" }} />
                                </ListItemIcon>
                                <ListItemText primary="Clases" />
                            </ListItemButton>
                        </Link>
                    }
                    {/* --- EJERCICIOS --- */}
                    {permissions.includes("core_data.view_exercise") &&
                        <Link href="/ejercicios">
                            <ListItemButton selected={selectedIndex === "ejercicios"}>
                                <ListItemIcon>
                                    <EjerciciosIcon style={{ color: "var(--beness-gris-oscuro)" }} />
                                </ListItemIcon>
                                <ListItemText primary="Ejercicios" />
                            </ListItemButton>
                        </Link>
                    }


                    {/* --- DATOS --- */}
                    {(permissions.includes("core_data.view_prop") ||
                        permissions.includes("core_data.customeruser") ||
                        permissions.includes("core_data.view_position") ||
                        permissions.includes("core_data.view_machine")) &&
                        <>
                            <ListItemButton onClick={deployDatos}>
                                <ListItemIcon>
                                    <StorageIcon style={{ color: "var(--beness-gris-oscuro)" }} />
                                </ListItemIcon>
                                <ListItemText primary="Datos" />
                                {openDatos ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>

                            <Collapse in={openDatos} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {permissions.includes("core_data.view_position") &&
                                        <Link href="/datos/posiciones">
                                            <ListItemButton selected={selectedIndex === "posiciones"} sx={{ pl: 4 }}>
                                                <ListItemText primary="Posiciones" />
                                            </ListItemButton>
                                        </Link>
                                    }

                                    {permissions.includes("core_data.view_prop") &&
                                        <Link href="/datos/implementos">
                                            <ListItemButton selected={selectedIndex === "implementos"} sx={{ pl: 4 }}>
                                                <ListItemText primary="Implementos" />
                                            </ListItemButton>
                                        </Link>
                                    }

                                    {permissions.includes("core_data.view_machine") &&
                                        <Link href="/datos/maquinas">
                                            <ListItemButton selected={selectedIndex === "maquinas"} sx={{ pl: 4 }}>
                                                <ListItemText primary="Máquinas" />
                                            </ListItemButton>
                                        </Link>
                                    }

                                    {permissions.includes("core_data.view_machine") &&
                                        <Link href="/datos/usuarios">
                                            <ListItemButton selected={selectedIndex === "usuarios"} sx={{ pl: 4 }}>
                                                <ListItemText primary="Usuarios" />
                                            </ListItemButton>
                                        </Link>
                                    }

                                </List>
                            </Collapse>
                        </>
                    }
                </List>

                <main className={styles.main}>{children}</main>
            </div>
        </>
    );
}

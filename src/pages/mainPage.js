import styles from "../styles/Principal.module.css";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import menuIcon from "../images/menu-icon.png";
import benessLogo from "../images/beness-logo.png";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventNoteIcon from "@mui/icons-material/EventNote";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PeopleIcon from "@mui/icons-material/People";
import ReplayIcon from "@mui/icons-material/Replay";
import SettingsIcon from "@mui/icons-material/Settings";
import StorageIcon from "@mui/icons-material/Storage";

import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import usePermissions from "@/hooks/usePermissions";
import routePermissions from "@/constants/routePermissions";


const navItems = [
    { href: "/home", label: "Home", key: "home", icon: HomeIcon },
    { href: "/dashboard", label: "Dashboard", key: "dashboard", icon: DashboardIcon },
    { href: "/retention", label: "Retention", key: "retention", icon: ReplayIcon },
    { href: "/schedule", label: "Schedule", key: "schedule", icon: EventNoteIcon },
    { href: "/uploads", label: "Uploads", key: "uploads", icon: CloudUploadIcon },
    { href: "/imported", label: "Imported", key: "imported", icon: AssessmentIcon },
    { href: "/data", label: "Data", key: "data", icon: StorageIcon },
    { href: "/manual", label: "Manual", key: "manual", icon: MenuBookIcon },
    { href: "/datos/usuarios", label: "Users", key: "usuarios", icon: PeopleIcon, permission: "core_data.view_customuser" },
    { href: "/settings", label: "Settings", key: "settings", icon: SettingsIcon },
];


export default function MainPage({ children }) {
    const router = useRouter();
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [navVisible, setNavVisible] = useState(false);
    const [showPage, setShowPage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionsChecked, setPermissionsChecked] = useState(false);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const permissions = usePermissions();

    useEffect(() => {
        if (typeof window === "undefined") return;

        const token = sessionStorage.getItem("token");
        if (!token) {
            router.push("/loginPage");
            return;
        }

        const validateToken = async () => {
            try {
                const response = await axios.post(`${backendUrl}/api/data/validate-token`, { token });
                if (response.data.valid) {
                    const accessResponse = await axios.get(`${backendUrl}/api/data/me/permissions/`, {
                        headers: { Authorization: `Token ${token}` },
                    });
                    sessionStorage.setItem("access", JSON.stringify(accessResponse.data));
                    sessionStorage.setItem("permissions", JSON.stringify(accessResponse.data.django_permissions || []));
                    setShowPage(true);
                } else {
                    router.push("/loginPage");
                }
            } catch (error) {
                console.error("Token validation error:", error);
                router.push("/loginPage");
            } finally {
                setIsLoading(false);
            }
        };

        validateToken();
    }, []);

    useEffect(() => {
        const currentItem = navItems
            .filter((item) => router.pathname.startsWith(item.href))
            .sort((a, b) => b.href.length - a.href.length)[0];
        setSelectedIndex(currentItem?.key || null);
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

    const handleLogout = async () => {
        try {
            await axios.post(`${backendUrl}/api/data/logout`, {}, {
                headers: { Authorization: `Token ${sessionStorage.getItem("token")}` },
            });
        } catch (error) {
            console.error("Logout error:", error);
        }
        sessionStorage.clear();
        router.push("/loginPage");
    };

    return (
        <>
            <header className={styles.header}>
                <Image
                    src={menuIcon}
                    alt="Menu Icon"
                    className={styles.menuIcon}
                    onClick={() => setNavVisible(!navVisible)}
                />
                <Image src={benessLogo} alt="Company Logo" className={styles.logo} onClick={() => router.push("/home")} />
                <Button className={styles.logoutButton} onClick={handleLogout}>
                    Cerrar Sesion
                </Button>
            </header>

            <div className={`${styles.container} ${navVisible ? styles.navVisible : ""}`}>
                <List component="nav" className={styles.nav}>
                    {navItems
                        .filter((item) => !item.permission || permissions.includes(item.permission))
                        .map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link href={item.href} key={item.href}>
                                    <ListItemButton selected={selectedIndex === item.key}>
                                        <ListItemIcon>
                                            <Icon style={{ color: "var(--beness-gris-oscuro)" }} />
                                        </ListItemIcon>
                                        <ListItemText primary={item.label} />
                                    </ListItemButton>
                                </Link>
                            );
                        })}
                </List>

                <main className={styles.main}>{children}</main>
            </div>
        </>
    );
}

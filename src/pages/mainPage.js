import styles from "../styles/Principal.module.css";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import benessLogo from "../images/beness-logo.png";

import AssessmentIcon from "@mui/icons-material/Assessment";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventNoteIcon from "@mui/icons-material/EventNote";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import ReplayIcon from "@mui/icons-material/Replay";
import SettingsIcon from "@mui/icons-material/Settings";
import StorageIcon from "@mui/icons-material/Storage";

import IconButton from "@mui/material/IconButton";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";

import usePermissions from "@/hooks/usePermissions";
import useAccess, { storeAccess } from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import routePermissions from "@/constants/routePermissions";


const navItems = [
    { href: "/home", labelKey: "nav.home", key: "home", icon: HomeIcon },
    { href: "/dashboard", labelKey: "nav.dashboard", key: "dashboard", icon: DashboardIcon },
    { href: "/clients", labelKey: "nav.clients", key: "clients", icon: PeopleIcon },
    { href: "/retention", labelKey: "nav.retention", key: "retention", icon: ReplayIcon },
    { href: "/schedule", labelKey: "nav.schedule", key: "schedule", icon: EventNoteIcon },
    { href: "/uploads", labelKey: "nav.uploads", key: "uploads", icon: CloudUploadIcon, capability: "can_upload_data" },
    { href: "/imported", labelKey: "nav.imported", key: "imported", icon: AssessmentIcon, capability: "can_upload_data" },
    { href: "/data", labelKey: "nav.data", key: "data", icon: StorageIcon },
    { href: "/manual", labelKey: "nav.manual", key: "manual", icon: MenuBookIcon },
    { href: "/settings", labelKey: "nav.settings", key: "settings", icon: SettingsIcon },
];


export default function MainPage({ children }) {
    const router = useRouter();
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [navVisible, setNavVisible] = useState(false);
    const [navCollapsed, setNavCollapsed] = useState(false);
    const [showPage, setShowPage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionsChecked, setPermissionsChecked] = useState(false);
    const [clientSearchInput, setClientSearchInput] = useState("");
    const [clientSearchOptions, setClientSearchOptions] = useState([]);
    const [clientSearchLoading, setClientSearchLoading] = useState(false);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const permissions = usePermissions();
    const access = useAccess();
    const { t } = useI18n();
    const userData = useFetchUserInfo();

    const hasRouteRequirement = (requirement) => {
        if (!requirement) return true;
        if (typeof requirement === "string") return permissions?.includes(requirement);
        if (requirement.permission) return permissions?.includes(requirement.permission);
        if (requirement.capability) return Boolean(access.capabilities?.[requirement.capability]);
        return true;
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
        setNavCollapsed(localStorage.getItem("nav-collapsed") === "true");
    }, []);

    const toggleCollapsed = () => {
        setNavCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("nav-collapsed", String(next));
            return next;
        });
    };

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
                    storeAccess(accessResponse.data);
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

        const requirement = matchedPath ? routePermissions[matchedPath] : null;
        if (!hasRouteRequirement(requirement)) {
            router.push("/home");
        } else {
            setPermissionsChecked(true);
        }
    }, [permissions, access, router.asPath]);

    useEffect(() => {
        if (!showPage || clientSearchInput.trim().length < 2) {
            setClientSearchOptions([]);
            setClientSearchLoading(false);
            return undefined;
        }

        const timeoutId = setTimeout(async () => {
            const token = sessionStorage.getItem("token");
            if (!token) return;
            setClientSearchLoading(true);
            try {
                const response = await axios.get(
                    `${backendUrl}/api/data/analytics/clients/search/`,
                    {
                        params: { q: clientSearchInput.trim() },
                        headers: { Authorization: `Token ${token}` },
                    },
                );
                setClientSearchOptions(response.data.results || []);
            } catch (error) {
                console.error("Client search error:", error);
                setClientSearchOptions([]);
            } finally {
                setClientSearchLoading(false);
            }
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [backendUrl, clientSearchInput, showPage]);

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

    const initials = [userData.firstName, userData.lastName]
        .filter(Boolean)
        .map((s) => s[0].toUpperCase())
        .join("");

    // On mobile (drawer open), always show labels regardless of collapsed state
    const showLabels = !navCollapsed || navVisible;
    const showTooltip = navCollapsed && !navVisible;

    const handleHamburger = () => {
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
            setNavVisible((v) => !v);
        } else {
            toggleCollapsed();
        }
    };

    const openSearchedClient = (client) => {
        if (!client?.id) return;
        setClientSearchInput("");
        setClientSearchOptions([]);
        router.push({
            pathname: "/clients/[id]",
            query: {
                id: client.id,
                return_to: router.asPath,
            },
        });
    };

    return (
        <>
            {navVisible && (
                <div className={styles.backdrop} onClick={() => setNavVisible(false)} />
            )}

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <IconButton onClick={handleHamburger} size="small" className={styles.hamburger}>
                        <MenuIcon />
                    </IconButton>
                    <Autocomplete
                        className={styles.clientSearch}
                        size="small"
                        options={clientSearchOptions}
                        loading={clientSearchLoading}
                        inputValue={clientSearchInput}
                        value={null}
                        filterOptions={(options) => options}
                        getOptionLabel={(option) => option?.name || ""}
                        noOptionsText={
                            clientSearchInput.trim().length < 2
                                ? t("clients.headerSearch.minChars")
                                : t("clients.headerSearch.noResults")
                        }
                        onInputChange={(_, value) => setClientSearchInput(value)}
                        onChange={(_, value) => openSearchedClient(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder={t("clients.headerSearch.placeholder")}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {clientSearchLoading && (
                                                <CircularProgress color="inherit" size={16} />
                                            )}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{option.name}</div>
                                    <div style={{ color: "#666", fontSize: "12px" }}>
                                        {option.mindbody_id || "N/A"} | {option.site || t("common.unknown")}
                                    </div>
                                </div>
                            </li>
                        )}
                    />
                </div>

                <Image
                    src={benessLogo}
                    alt="Beness"
                    className={styles.logo}
                    onClick={() => router.push("/home")}
                />

                <div className={styles.userArea}>
                    <div className={styles.avatar}>{initials || "?"}</div>
                    {userData.firstName && (
                        <span className={styles.userName}>{userData.firstName}</span>
                    )}
                    <Tooltip title={t("nav.logout")} placement="bottom">
                        <IconButton
                            onClick={handleLogout}
                            size="small"
                            className={styles.logoutBtn}
                        >
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </div>
            </header>

            <div
                className={[
                    styles.container,
                    navCollapsed ? styles.collapsed : "",
                    navVisible ? styles.navVisible : "",
                ].join(" ")}
            >
                <nav className={styles.nav}>
                    <List component="div" disablePadding sx={{ px: 0.5, py: 0.75 }}>
                        {navItems.filter(hasRouteRequirement).map((item) => {
                            const Icon = item.icon;
                            const isActive = selectedIndex === item.key;
                            return (
                                <Tooltip
                                    key={item.href}
                                    title={showTooltip ? t(item.labelKey) : ""}
                                    placement="right"
                                    arrow
                                >
                                    <Link href={item.href} style={{ display: "block" }}>
                                        <ListItemButton
                                            selected={isActive}
                                            sx={{
                                                borderLeft: isActive
                                                    ? "3px solid var(--beness-azul)"
                                                    : "3px solid transparent",
                                                borderRadius: "6px",
                                                my: 0.25,
                                                minHeight: 44,
                                                justifyContent: showLabels ? "flex-start" : "center",
                                                "&.Mui-selected": {
                                                    backgroundColor: "rgba(138, 184, 215, 0.18)",
                                                },
                                                "&.Mui-selected:hover": {
                                                    backgroundColor: "rgba(138, 184, 215, 0.28)",
                                                },
                                                "&:hover": {
                                                    backgroundColor: "rgba(74, 75, 69, 0.08)",
                                                },
                                            }}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: showLabels ? 36 : 0,
                                                    mr: showLabels ? 1 : 0,
                                                    color: isActive
                                                        ? "var(--beness-azul)"
                                                        : "var(--beness-gris-oscuro)",
                                                }}
                                            >
                                                <Icon />
                                            </ListItemIcon>
                                            {showLabels && (
                                                <ListItemText
                                                    primary={t(item.labelKey)}
                                                    slotProps={{
                                                        primary: {
                                                            fontSize: 14,
                                                            fontWeight: isActive ? 600 : 400,
                                                            color: isActive
                                                                ? "var(--beness-azul)"
                                                                : "var(--beness-gris-oscuro)",
                                                        },
                                                    }}
                                                />
                                            )}
                                        </ListItemButton>
                                    </Link>
                                </Tooltip>
                            );
                        })}
                    </List>
                </nav>

                <main className={styles.main}>{children}</main>
            </div>
        </>
    );
}

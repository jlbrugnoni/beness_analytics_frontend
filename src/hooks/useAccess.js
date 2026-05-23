import { useEffect, useState } from "react";
import { LANGUAGE_CHANGED_EVENT, LANGUAGE_STORAGE_KEY } from "@/i18n/translations";


const defaultAccess = {
    capabilities: {},
    groups: [],
    allowed_sites: [],
    allowed_studios: [],
    has_global_access: false,
};


const readAccess = () => {
    if (typeof window === "undefined") return defaultAccess;
    const stored = sessionStorage.getItem("access");
    if (!stored || stored === "undefined" || stored === "null") return defaultAccess;
    try {
        return { ...defaultAccess, ...JSON.parse(stored) };
    } catch (error) {
        console.error("Error parsing access profile:", error);
        return defaultAccess;
    }
};


const useAccess = () => {
    const [access, setAccess] = useState(defaultAccess);

    useEffect(() => {
        const refreshAccess = () => setAccess(readAccess());

        refreshAccess();
        window.addEventListener(LANGUAGE_CHANGED_EVENT, refreshAccess);
        window.addEventListener("storage", refreshAccess);
        return () => {
            window.removeEventListener(LANGUAGE_CHANGED_EVENT, refreshAccess);
            window.removeEventListener("storage", refreshAccess);
        };
    }, []);

    return access;
};


export default useAccess;


export const hasCapability = (capability) => Boolean(readAccess().capabilities?.[capability]);


export const storeAccess = (access) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("access", JSON.stringify(access));
    if (access?.language) {
        sessionStorage.setItem(LANGUAGE_STORAGE_KEY, access.language);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, access.language);
        window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { language: access.language } }));
    }
};

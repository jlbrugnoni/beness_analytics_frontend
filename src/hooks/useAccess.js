import { useEffect, useState } from "react";


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
        setAccess(readAccess());
    }, []);

    return access;
};


export default useAccess;


export const hasCapability = (capability) => Boolean(readAccess().capabilities?.[capability]);

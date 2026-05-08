import { useEffect, useState } from "react";

const usePermissions = () => {
    const [permissions, setPermissions] = useState(null);

    useEffect(() => {
        const stored = sessionStorage.getItem("permissions");
        
        // Verifica que stored no sea null, "undefined" o cadena vacía
        if (stored && stored !== "undefined" && stored !== "null") {
            try {
                setPermissions(JSON.parse(stored));
            } catch (error) {
                console.error("Error parsing permissions:", error);
                setPermissions([]);
            }
        } else {
            setPermissions([]);
        }
    }, []);

    return permissions;
};

export default usePermissions;

export const hasPermission = (perm) => {
    if (typeof window === "undefined") return false;

    const stored = sessionStorage.getItem("permissions");
    
    // Misma validación aquí
    if (!stored || stored === "undefined" || stored === "null") {
        return false;
    }
    
    try {
        const permissions = JSON.parse(stored);
        return permissions.includes(perm);
    } catch (error) {
        console.error("Error parsing permissions:", error);
        return false;
    }
};

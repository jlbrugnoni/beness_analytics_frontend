import { useCallback, useEffect, useMemo, useState } from "react";

import {
    DEFAULT_LANGUAGE,
    LANGUAGE_CHANGED_EVENT,
    LANGUAGE_STORAGE_KEY,
    languages,
    translations,
} from "@/i18n/translations";


export const getStoredLanguage = () => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = sessionStorage.getItem(LANGUAGE_STORAGE_KEY) || localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return translations[stored] ? stored : DEFAULT_LANGUAGE;
};


export const setStoredLanguage = (language) => {
    const nextLanguage = translations[language] ? language : DEFAULT_LANGUAGE;
    if (typeof window !== "undefined") {
        sessionStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { language: nextLanguage } }));
    }
    return nextLanguage;
};


const translate = (language, key, fallback) => {
    const dictionary = translations[language] || translations[DEFAULT_LANGUAGE];
    return dictionary[key] || translations[DEFAULT_LANGUAGE][key] || fallback || key;
};


export default function useI18n() {
    const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

    useEffect(() => {
        setLanguage(getStoredLanguage());

        const handleLanguageChange = (event) => {
            setLanguage(event.detail?.language || getStoredLanguage());
        };

        window.addEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);
        window.addEventListener("storage", handleLanguageChange);
        return () => {
            window.removeEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);
            window.removeEventListener("storage", handleLanguageChange);
        };
    }, []);

    const t = useCallback((key, fallback) => translate(language, key, fallback), [language]);

    return useMemo(() => ({ language, setLanguage: setStoredLanguage, t, languages }), [language, t]);
}

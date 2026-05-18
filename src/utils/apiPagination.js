export const normalizeApiNextUrl = (nextUrl, backendUrl) => {
    if (!nextUrl) return null;
    try {
        const next = new URL(nextUrl, backendUrl);
        const backend = new URL(backendUrl);
        return `${backend.origin}${next.pathname}${next.search}`;
    } catch {
        return nextUrl;
    }
};

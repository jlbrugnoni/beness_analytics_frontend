import axios from "axios";
import { normalizeApiNextUrl } from "./apiPagination";

export async function fetchApiRows(url, config, backendUrl) {
    const rows = [];
    let next = url;
    while (next) {
        const response = await axios.get(next, config);
        rows.push(...(response.data.results || response.data));
        next = normalizeApiNextUrl(response.data.next, backendUrl);
    }
    return rows;
}

import { useState } from "react";
import axios from "axios";
import { Alert, Button, Stack } from "@mui/material";
import { api, auth } from "./workspace/common";

export default function GeneralCashButton({ company, done, w }) {
    const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const create = async () => { setBusy(true); setError("");
        try { const { data } = await axios.post(api(`companies/${company}/general-cash/`), {}, auth()); done(data); }
        catch { setError(w("error")); } finally { setBusy(false); }
    };
    return <Stack>{error && <Alert severity="error">{error}</Alert>}<Button disabled={busy} onClick={create}>{w("createCashAccount")}</Button></Stack>;
}

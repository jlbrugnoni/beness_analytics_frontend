import { Alert, Chip, Stack, Typography } from "@mui/material";
import useI18n from "@/hooks/useI18n";
import { capabilityNames } from "@/constants/accessCapabilities";

export default function AccessSummary({ access }) {
    const { t } = useI18n();
    const granted = capabilityNames.filter((name) => access?.capabilities?.[name]);
    return <Stack spacing={1} sx={{ my: 2 }}>
        <Alert severity="info">{t("access.directHelp")}</Alert>
        {access && <>
            <Typography variant="h6">{t("access.effective")}</Typography>
            {granted.length ? granted.map((name) => <Chip key={name} variant="outlined"
                sx={{ height: "auto", py: 0.5, "& .MuiChip-label": { whiteSpace: "normal" } }}
                label={`${t(`access.${name}`)} — ${t("access.source")}: ${(access.capability_sources?.[name] || []).join(", ")}`} />)
                : <Typography>{t("access.none")}</Typography>}
        </>}
    </Stack>;
}

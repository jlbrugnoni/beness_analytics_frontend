import { Stack, TextField, MenuItem, Typography } from "@mui/material";

export function InvoiceImportFilters({ value, onChange, t }) {
    const label = (key) => t(`finance.sales.${key}`);
    return <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField select size="small" label={label("filter")} value={value.outcome} onChange={(e) => onChange({ ...value, outcome: e.target.value })} sx={{ minWidth: 220 }}>
            <MenuItem value="all">{label("all")}</MenuItem><MenuItem value="invalid">{label("rejected")}</MenuItem>
        </TextField>
        <TextField size="small" label={label("searchInvoice")} value={value.search} onChange={(e) => onChange({ ...value, search: e.target.value })} inputProps={{ maxLength: 100 }} />
    </Stack>;
}

export default function InvoiceSourceReview({ row, t }) {
    return <Stack spacing={0.5}>
        {(row.review_issues || row.issues || []).map((issue) => <Typography variant="body2" color="warning.dark" key={issue}>{t(`finance.sales.${issue}`, issue)}</Typography>)}
        {row.source_rows?.length > 0 && <Typography variant="caption">{t("finance.sales.sourceRows")}: {row.source_rows.join(", ")}</Typography>}
    </Stack>;
}

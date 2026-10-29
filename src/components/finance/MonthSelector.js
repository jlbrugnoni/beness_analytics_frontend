import { FormControl, FormHelperText, FormLabel, IconButton, MenuItem, Stack, TextField } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useI18n from "@/hooks/useI18n";

const valid = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "") && Number(value.slice(0, 4)) > 0;
const localMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; };

export default function MonthSelector({ value, onChange, label, referenceMonth, disabled = false, required = false, error = false, helperText, allowEmpty = true }) {
    const { language, t } = useI18n();
    const w = (key) => t(`finance.workspace.${key}`);
    const selected = valid(value);
    // A reference controls available years only; opening an empty field never assigns a period.
    const [year, month] = (selected ? value : valid(referenceMonth) ? referenceMonth : localMonth()).split("-").map(Number);
    const years = Array.from({ length: 16 }, (_, i) => year - 10 + i).filter((item) => item >= 1 && item <= 9999);
    const names = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(language, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, i, 1))));
    const choose = (y, m) => onChange(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`);
    const shift = (delta) => { const index = year * 12 + month - 1 + delta; choose(Math.floor(index / 12), index % 12 + 1); };
    return <FormControl component="fieldset" error={error} disabled={disabled} required={required} sx={{ minWidth: 0 }}>
        {label && <FormLabel component="legend" sx={{ mb: 1 }}>{label}</FormLabel>}
        <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="small" aria-label={w("closure_previousMonth")} title={w("closure_previousMonth")} disabled={disabled || !selected || value === "0001-01"} onClick={() => shift(-1)}><ChevronLeftIcon /></IconButton>
            <TextField select fullWidth label={w("closure_month")} value={selected ? month : ""} disabled={disabled} error={error} required={required} InputLabelProps={{ shrink: true }} SelectProps={{ displayEmpty: true }} sx={{ minWidth: 110 }} onChange={(e) => e.target.value === "" ? onChange("") : choose(year, Number(e.target.value))}>
                {allowEmpty && <MenuItem value="">{w("unknown")}</MenuItem>}{names.map((name, i) => <MenuItem key={i} value={i + 1}>{name}</MenuItem>)}
            </TextField>
            <TextField select label={w("closure_year")} value={selected ? year : ""} disabled={disabled} error={error} required={required} InputLabelProps={{ shrink: true }} SelectProps={{ displayEmpty: true }} sx={{ minWidth: 85 }} onChange={(e) => e.target.value === "" ? onChange("") : choose(Number(e.target.value), month)}>
                {allowEmpty && <MenuItem value="">{w("unknown")}</MenuItem>}{years.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
            <IconButton size="small" aria-label={w("closure_nextMonth")} title={w("closure_nextMonth")} disabled={disabled || !selected || value === "9999-12"} onClick={() => shift(1)}><ChevronRightIcon /></IconButton>
        </Stack>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>;
}

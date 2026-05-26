import { useState } from "react";
import {
    Bar,
    BarChart as RechartsBarChart,
    CartesianGrid,
    ComposedChart,
    LabelList,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from "recharts";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";


// ─── Chart styling constants ─────────────────────────────────────────────────

export const chartText = { fontSize: 15 };
export const chartTooltipStyle = { fontSize: 14, borderRadius: 6, borderColor: "#d8dee4" };
export const expandedChartTooltipStyle = { fontSize: 17, borderRadius: 8, borderColor: "#d8dee4", padding: "12px 14px" };
export const chartLegendStyle = { fontSize: 15, paddingTop: 8, color: "#2f3a45" };
export const completedColor = "#2f6f73";
export const attentionColor = "#d97706";
export const unusedCapacityColor = "#d8dee4";
export const chartLabelStyle = { fill: "#2f3a45", fontSize: 14, fontWeight: 700 };
export const trendStrokeStyle = { strokeDasharray: "6 5", dot: false, activeDot: false, strokeWidth: 2.5 };
export const occupancyEmptyColor = "#f6f8fa";
export const memberMixColors = ["#2f6f73", "#8a5cf6", "#d97706", "#64748b"];


// ─── Utility functions ────────────────────────────────────────────────────────

export const occupancyHeatColor = (value) => {
    const rate = Math.max(0, Math.min(100, Number(value || 0)));
    if (rate === 0) return "#fecaca";
    if (rate < 35) return "#fef2f2";
    if (rate < 55) return "#ffedd5";
    if (rate < 75) return "#fef3c7";
    if (rate < 90) return "#dcfce7";
    return "#bbf7d0";
};


export const trendKey = (key) => `${key}_trend`;


export const addLinearTrendLines = (rows, keys) => {
    const nextRows = (rows || []).map((row) => ({ ...row }));
    keys.forEach((key) => {
        const points = nextRows
            .map((row, index) => ({ index, value: Number(row[key]) }))
            .filter((point) => Number.isFinite(point.value));
        if (points.length < 2) return;
        const count = points.length;
        const sumX = points.reduce((sum, point) => sum + point.index, 0);
        const sumY = points.reduce((sum, point) => sum + point.value, 0);
        const sumXY = points.reduce((sum, point) => sum + point.index * point.value, 0);
        const sumXX = points.reduce((sum, point) => sum + point.index * point.index, 0);
        const denominator = count * sumXX - sumX * sumX;
        const slope = denominator ? (count * sumXY - sumX * sumY) / denominator : 0;
        const intercept = (sumY - slope * sumX) / count;
        nextRows.forEach((row, index) => {
            row[trendKey(key)] = Number((intercept + slope * index).toFixed(2));
        });
    });
    return nextRows;
};


export const translateOrKey = (t, key, fallback) => (typeof t === "function" ? t(key, fallback) : (fallback || key));


// ─── Formatting functions ─────────────────────────────────────────────────────

export const formatNumber = (value) => Number(value || 0).toLocaleString();

export const formatMoney = (value, t) => {
    if (value === null || value === undefined) return translateOrKey(t, "common.restricted", "Restricted");
    return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatCompactMoney = (value) => {
    const numberValue = Number(value || 0);
    if (Math.abs(numberValue) >= 1000000) return `${(numberValue / 1000000).toFixed(1)}M`;
    if (Math.abs(numberValue) >= 1000) return `${(numberValue / 1000).toFixed(0)}K`;
    return formatMoney(numberValue);
};

export const truncateLabel = (value, maxLength = 24) => {
    const text = String(value || "N/A");
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

export const formatPercent = (value) => `${formatNumber(value)}%`;

export const formatPercentOneDecimal = (value) => `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})}%`;

export const numericValue = (value) => Number(value || 0);

export const comparisonDelta = (current, previous, options = {}) => {
    const difference = numericValue(current) - numericValue(previous);
    const decimals = options.decimals ?? 0;
    const suffix = options.suffix || "";
    const tone = difference > 0
        ? (options.invertTone ? "down" : "up")
        : difference < 0
            ? (options.invertTone ? "up" : "down")
            : "flat";
    const formattedDifference = options.money
        ? formatMoney(Math.abs(difference))
        : Math.abs(difference).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    const sign = difference > 0 ? "+" : difference < 0 ? "-" : "";
    const labelValue = Math.abs(difference) < 0.005
        ? (options.money ? formatMoney(0) : `0${suffix}`)
        : `${sign}${options.money ? formattedDifference : `${formattedDifference}${suffix}`}`;
    return {
        tone,
        label: `${labelValue} ${options.previousLabel || `vs previous ${options.periodLabel || "period"}`}`,
    };
};

export const formatActivityStatus = (value) => ({
    inactive: "Inactive",
    attending_unpaid: "Attending Unpaid",
    attending_paid: "Attending Paid",
}[value] || "N/A");


// ─── Date / period helpers ────────────────────────────────────────────────────

export const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1).padStart(2, "0");
    return { value, labelKey: `months.${value}` };
});


export const yearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 3 + index);
};


export const currentMonthValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};


export const weekdayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const weekdayNameKeyLookup = weekdayNames.reduce((lookup, name, index) => {
    lookup[name] = weekdayKeys[index];
    return lookup;
}, {});


export const lastCompletedMonthValue = () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = previousMonth.getFullYear();
    const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};


export const monthParts = (monthValue) => {
    const [year, month] = monthValue.split("-");
    return { year, month };
};


export const buildMonthValue = (year, month) => `${year}-${month}`;


export const parseDateValue = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};


export const formatDateValue = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


export const addMonths = (monthValue, amount) => {
    const [year, month] = monthValue.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + amount, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
};


export const addDays = (dateValue, amount) => {
    const nextDate = parseDateValue(dateValue);
    nextDate.setDate(nextDate.getDate() + amount);
    return formatDateValue(nextDate);
};


export const monthRange = (monthValue) => {
    const [year, month] = monthValue.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
        date_from: `${monthValue}-01`,
        date_to: `${monthValue}-${String(lastDay).padStart(2, "0")}`,
    };
};


export const weekRange = (value = new Date()) => {
    const dateValue = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const weekday = dateValue.getDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    const start = new Date(dateValue);
    start.setDate(dateValue.getDate() - daysFromMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
        date_from: formatDateValue(start),
        date_to: formatDateValue(end),
    };
};


export const previousWeekRange = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return weekRange(today);
};


export const weekRangeFromDate = (value) => {
    if (!value) return weekRange();
    return weekRange(parseDateValue(value));
};


export const selectedDateRange = (dashboardMode, periodMode, filters) => {
    if (dashboardMode === "weekly") {
        if (periodMode === "current_week") return weekRange();
        if (periodMode === "previous_week") return previousWeekRange();
        if (periodMode === "specific_week") return weekRangeFromDate(filters.week_date);
        return { date_from: filters.date_from, date_to: filters.date_to };
    }
    if (periodMode === "last_completed_month") return monthRange(lastCompletedMonthValue());
    if (periodMode === "current_month") return monthRange(currentMonthValue());
    if (periodMode === "specific_month") return monthRange(filters.month);
    return monthRange(lastCompletedMonthValue());
};


export const weekdayIndex = (dateValue) => {
    const day = parseDateValue(dateValue).getDay();
    return day === 0 ? 6 : day - 1;
};


export const rowsByWeekday = (rows, dateKey = "date") => {
    const lookup = {};
    (rows || []).forEach((row) => {
        if (!row[dateKey]) return;
        lookup[weekdayIndex(row[dateKey])] = row;
    });
    return lookup;
};


export const weeklyComparisonRows = (dateRange, currentRows, previousRows, valueKey = "total", t) => {
    if (!dateRange?.date_from) return [];
    const currentLookup = rowsByWeekday(currentRows);
    const previousLookup = rowsByWeekday(previousRows);
    return Array.from({ length: 7 }, (_, index) => {
        const dateValue = addDays(dateRange.date_from, index);
        return {
            label: formatShortWeekdayDate(dateValue, t),
            current: Number(currentLookup[index]?.[valueKey] || 0),
            previous: Number(previousLookup[index]?.[valueKey] || 0),
        };
    });
};


export const formatDisplayDate = (value, t) => {
    if (!value) return "N/A";
    const dateValue = parseDateValue(value);
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    return `${translateOrKey(t, `monthsShort.${month}`)} ${dateValue.getDate()}, ${dateValue.getFullYear()}`;
};


export const formatShortWeekdayDate = (value, t) => {
    if (!value) return "N/A";
    const dateValue = parseDateValue(value);
    const weekday = translateOrKey(t, `weekdaysShort.${weekdayKeys[weekdayIndex(value)]}`);
    const day = String(dateValue.getDate()).padStart(2, "0");
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    return `${weekday} ${day}-${month}`;
};


export const formatPeriodTitle = (dashboardMode, dateRange, t) => {
    if (!dateRange?.date_from || !dateRange?.date_to) return "N/A";
    const start = parseDateValue(dateRange.date_from);
    const end = parseDateValue(dateRange.date_to);
    const startMonth = String(start.getMonth() + 1).padStart(2, "0");
    const endMonth = String(end.getMonth() + 1).padStart(2, "0");
    if (dashboardMode === "monthly") {
        return `${translateOrKey(t, `months.${startMonth}`)} ${start.getFullYear()}`;
    }
    return `${translateOrKey(t, `monthsShort.${startMonth}`)} ${start.getDate()} - ${translateOrKey(t, `monthsShort.${endMonth}`)} ${end.getDate()}, ${end.getFullYear()}`;
};


export const formatMonthLabel = (monthValue, t) => {
    if (!monthValue) return "N/A";
    const dateValue = parseDateValue(monthValue);
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    return `${translateOrKey(t, `monthsShort.${month}`)} ${String(dateValue.getFullYear()).slice(-2)}`;
};


// ─── firstQueryValue helper ───────────────────────────────────────────────────

export const firstQueryValue = (value) => Array.isArray(value) ? value[0] : value;


// ─── Small toggle / label components ─────────────────────────────────────────

export const TrendToggle = ({ checked, onChange, label = "Trend line" }) => (
    <Stack direction="row" justifyContent="flex-end">
        <FormControlLabel
            control={<Switch size="small" checked={checked} onChange={(event) => onChange(event.target.checked)} />}
            label={label}
            sx={{
                marginRight: 0,
                ".MuiFormControlLabel-label": { fontSize: 15, fontWeight: 700, color: "#2f3a45" },
            }}
        />
    </Stack>
);


export const StackedPercentLabel = ({ x, y, width, height, value, payload }) => {
    const total = Number(payload?.current_members || 0);
    const percent = total ? (Number(value || 0) / total) * 100 : 0;
    if (!value || !total || percent < 1 || width < 34) return null;
    const label = formatPercentOneDecimal(percent);
    const labelWidth = Math.max(34, label.length * 9 + 10);
    const labelHeight = 20;
    const labelX = x + width / 2;
    const labelY = y + height / 2;
    return (
        <g>
            <rect
                x={labelX - labelWidth / 2}
                y={labelY - labelHeight / 2}
                width={labelWidth}
                height={labelHeight}
                rx={4}
                fill="#ffffff"
                opacity={0.92}
            />
            <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#111827"
                fontSize={13}
                fontWeight={900}
            >
                {label}
            </text>
        </g>
    );
};


export const StackedTotalLabel = ({ x, y, width, value }) => {
    if (!value) return null;
    return (
        <text
            x={x + width / 2}
            y={Math.max(14, y - 8)}
            textAnchor="middle"
            fill="#172033"
            fontSize={14}
            fontWeight={900}
        >
            {formatNumber(value)}
        </text>
    );
};


// ─── KPI / Insight cards ──────────────────────────────────────────────────────

export const KpiCard = ({ label, value, action }) => (
    <Paper style={{ padding: "18px", minHeight: "96px", display: "grid", gap: "10px" }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
            <div style={{ color: "#555", fontSize: "15px", fontWeight: 700 }}>{label}</div>
            {action}
        </Stack>
        <div style={{ fontSize: "32px", fontWeight: 800, marginTop: "4px" }}>{value}</div>
    </Paper>
);


export const InsightCard = ({ title, value, caption, delta, details = [], action }) => (
    <Paper style={{ padding: "20px", display: "grid", gap: "16px", minHeight: "230px" }}>
        <div>
            <div style={{ color: "#555", fontSize: "15px", fontWeight: 800, textTransform: "uppercase" }}>{title}</div>
            <div style={{ fontSize: "34px", fontWeight: 800, marginTop: "4px" }}>{value}</div>
            {delta && (
                <div style={{ color: delta.tone === "down" ? "#b42318" : delta.tone === "flat" ? "#555" : "#1f7a4d", fontSize: "16px", fontWeight: 800, marginTop: "4px" }}>
                    {delta.label}
                </div>
            )}
            {caption && <div style={{ color: "#555", fontSize: "16px", lineHeight: 1.35, marginTop: "6px" }}>{caption}</div>}
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
            {details.map((detail) => (
                <div
                    key={detail.label}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        borderTop: "1px solid #eef1f4",
                        paddingTop: "8px",
                    }}
                >
                    <span style={{ color: "#555", fontSize: "16px" }}>{detail.label}</span>
                    <strong style={{ fontSize: "16px", textAlign: "right" }}>{detail.value}</strong>
                </div>
            ))}
        </div>
        {action && <div>{action}</div>}
    </Paper>
);


// ─── Tables ───────────────────────────────────────────────────────────────────

export const BreakdownTable = ({ title, rows, nameKey = "name", valueKey = "total", money = false, t }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>{t("common.concept")}</TableCell>
                        <TableCell align="right">{t("common.value")}</TableCell>
                        {rows?.some((row) => row.count !== undefined) && <TableCell align="right">{t("common.count")}</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).slice(0, 10).map((row, index) => (
                        <TableRow key={`${title}-${index}`}>
                            <TableCell>{row[nameKey] ?? "N/A"}</TableCell>
                            <TableCell align="right">{money ? formatMoney(row[valueKey]) : formatNumber(row[valueKey])}</TableCell>
                            {rows?.some((item) => item.count !== undefined) && (
                                <TableCell align="right">{row.count !== undefined ? formatNumber(row.count) : ""}</TableCell>
                            )}
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={3}>{t("common.noData")}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


export const OccupationTable = ({ title, rows, labelKey = "name", t }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("common.concept")}</TableCell>
                        <TableCell align="right">{t("common.capacity")}</TableCell>
                        <TableCell align="right">{t("common.attendance")}</TableCell>
                        <TableCell align="right">{t("common.occupancy")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${index}`}>
                            <TableCell>{labelKey === "date" ? formatShortWeekdayDate(row[labelKey], t) : row[labelKey] || "N/A"}</TableCell>
                            <TableCell align="right">{formatNumber(row.capacity)}</TableCell>
                            <TableCell align="right">{formatNumber(row.attended)}</TableCell>
                            <TableCell align="right">{formatNumber(row.occupation_rate)}%</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={4}>{t("common.noData")}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


export const OccupancySlotTable = ({ title, rows, t }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("common.slot")}</TableCell>
                        <TableCell>{t("common.studio")}</TableCell>
                        <TableCell align="right">{t("common.capacity")}</TableCell>
                        <TableCell align="right">{t("common.attendance")}</TableCell>
                        <TableCell align="right">{t("common.occupancy")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${row.date}-${row.start_time}-${row.studio}-${index}`}>
                            <TableCell>
                                <div>{formatShortWeekdayDate(row.date, t)}</div>
                                <div style={{ color: "#666", fontSize: "12px" }}>{row.start_time || "N/A"}</div>
                            </TableCell>
                            <TableCell>{row.studio || "N/A"}</TableCell>
                            <TableCell align="right">{formatNumber(row.capacity)}</TableCell>
                            <TableCell align="right">{formatNumber(row.attended)}</TableCell>
                            <TableCell align="right">{formatNumber(row.occupation_rate)}%</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={5}>{t("common.noData")}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


export const RetentionTable = ({ title, rows }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Studio</TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Activity</TableCell>
                        <TableCell align="right">Days</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Purchases</TableCell>
                        <TableCell align="right">Lifetime</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${row.id || index}`}>
                            <TableCell>{row.month || "N/A"}</TableCell>
                            <TableCell>{row.client || "N/A"}</TableCell>
                            <TableCell>{row.studio || "Unknown"}</TableCell>
                            <TableCell>{row.service || "N/A"}</TableCell>
                            <TableCell>{row.status || "N/A"}</TableCell>
                            <TableCell>
                                <div>{formatActivityStatus(row.not_renewed_activity_status)}</div>
                                {!!row.post_expiration_attendance_count && (
                                    <div style={{ color: "#666", fontSize: "12px" }}>
                                        {formatNumber(row.post_expiration_attendance_count)} visits
                                    </div>
                                )}
                            </TableCell>
                            <TableCell align="right">{formatNumber(row.membership_days || row.previous_membership_days)}</TableCell>
                            <TableCell align="right">{formatMoney(row.total_amount)}</TableCell>
                            <TableCell align="right">{formatNumber(row.tracked_membership_purchase_count)}</TableCell>
                            <TableCell align="right">{formatMoney(row.lifetime_membership_value)}</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={10}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


export const retentionTableColumns = {
    not_renewed: [
        { key: "client", label: "Client" },
        { key: "studio", label: "Studio" },
        { key: "service", label: "Service" },
        { key: "status", label: "Status", format: (row) => row.status || "N/A" },
        { key: "activity", label: "Activity", format: (row) => formatActivityStatus(row.not_renewed_activity_status) },
        { key: "sale_date", label: "Last Purchase" },
        { key: "expiration_date", label: "Expiration" },
        { key: "total_amount", label: "Amount", align: "right", format: (row) => formatMoney(row.total_amount) },
        { key: "tracked_membership_purchase_count", label: "Purchases", align: "right", format: (row) => formatNumber(row.tracked_membership_purchase_count) },
        { key: "lifetime_membership_value", label: "Lifetime", align: "right", format: (row) => formatMoney(row.lifetime_membership_value) },
    ],
    retained: [
        { key: "client", label: "Client" },
        { key: "studio", label: "Studio" },
        { key: "service", label: "Service" },
        { key: "sale_date", label: "Last Purchase" },
        { key: "expiration_date", label: "Expiration" },
        { key: "total_amount", label: "Amount", align: "right", format: (row) => formatMoney(row.total_amount) },
        { key: "tracked_membership_purchase_count", label: "Purchases", align: "right", format: (row) => formatNumber(row.tracked_membership_purchase_count) },
        { key: "lifetime_membership_value", label: "Lifetime", align: "right", format: (row) => formatMoney(row.lifetime_membership_value) },
    ],
    new_members: [
        { key: "month", label: "Month" },
        { key: "client", label: "Client" },
        { key: "studio", label: "Studio" },
        { key: "service", label: "Service Purchased" },
        { key: "sale_date", label: "Purchase Date" },
        { key: "expiration_date", label: "Expiration" },
        { key: "total_amount", label: "Amount", align: "right", format: (row) => formatMoney(row.total_amount) },
    ],
    reactivated: [
        { key: "client", label: "Client" },
        { key: "studio", label: "Studio" },
        { key: "service", label: "Service" },
        { key: "sale_date", label: "Reactivation Purchase" },
        { key: "expiration_date", label: "Expiration" },
        { key: "total_amount", label: "Amount", align: "right", format: (row) => formatMoney(row.total_amount) },
        { key: "last_membership_purchase_date", label: "Previous Purchase" },
    ],
};


export const RetentionDetailTable = ({ rows, tableKey, t }) => {
    const columns = retentionTableColumns[tableKey] || retentionTableColumns.not_renewed;
    const headerLabels = {
        Client: t("common.client"),
        Studio: t("common.studio"),
        Service: t("common.service"),
        Status: t("common.status"),
        Activity: "Activity",
        "Last Purchase": "Last Purchase",
        Expiration: t("common.expiration"),
        Amount: t("common.amount"),
        Purchases: t("common.purchases"),
        Lifetime: t("common.lifetime"),
        Month: t("common.month"),
        "Service Purchased": "Service Purchased",
        "Purchase Date": "Purchase Date",
        "Reactivation Purchase": "Reactivation Purchase",
        "Previous Purchase": "Previous Purchase",
    };
    return (
        <TableContainer style={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell key={column.key} align={column.align || "left"}>{headerLabels[column.label] || column.label}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${tableKey}-${row.id || index}`}>
                            {columns.map((column) => (
                                <TableCell key={column.key} align={column.align || "left"}>
                                    {column.format ? column.format(row) : row[column.key] || "N/A"}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={columns.length}>{t("common.noData")}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};


export const RetentionSummaryTableCard = ({ title, rows, tableKey, onExpand, t }) => (
    <Paper style={{ padding: "16px" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <Button size="small" variant="outlined" onClick={onExpand}>{t("common.openTable")}</Button>
        </Stack>
        <RetentionDetailTable rows={(rows || []).slice(0, 5)} tableKey={tableKey} t={t} />
    </Paper>
);


export const InstructorQualityTable = ({ rows, t }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{t("dashboard.charts.instructorQuality")}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("common.instructor")}</TableCell>
                        <TableCell align="right">{t("dashboard.kpi.totalBookings")}</TableCell>
                        <TableCell align="right">{t("dashboard.kpi.completedVisits")}</TableCell>
                        <TableCell align="right">{t("dashboard.kpi.noShowRate")}</TableCell>
                        <TableCell align="right">{t("dashboard.kpi.lateCancelRate")}</TableCell>
                        <TableCell align="right">{t("common.revenue")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`instructor-quality-${index}`}>
                            <TableCell>{row.name || "N/A"}</TableCell>
                            <TableCell align="right">{formatNumber(row.total)}</TableCell>
                            <TableCell align="right">{formatNumber(row.attended)}</TableCell>
                            <TableCell align="right">{formatNumber(row.no_show_rate)}%</TableCell>
                            <TableCell align="right">{formatNumber(row.late_cancel_rate)}%</TableCell>
                            <TableCell align="right">{formatMoney(row.revenue)}</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={6}>{t("common.noData")}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


// ─── Chart sub-components ─────────────────────────────────────────────────────

export const MemberTrendChart = ({ rows, t }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = showTrend ? addLinearTrendLines(rows, ["current_members"]) : rows;

    return (
        <Paper style={{ padding: "16px" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                <h2 style={{ margin: 0 }}>{t("dashboard.charts.memberTrend")}</h2>
                <TrendToggle checked={showTrend} onChange={setShowTrend} label={t("common.trendLine")} />
            </Stack>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 20, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value, name) => {
                                if (name === "current_members_trend") return [formatNumber(value), t("dashboard.kpi.currentMembersTrend")];
                                return [formatNumber(value), name];
                            }}
                            contentStyle={chartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="not_renewed" name={t("dashboard.kpi.notRenewed")} fill="#b42318" radius={[4, 4, 0, 0]} />
                        <Line
                            type="monotone"
                            dataKey="current_members"
                            name={t("dashboard.kpi.currentMembers")}
                            stroke="#2f6f73"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                type="linear"
                                dataKey={trendKey("current_members")}
                                name={t("dashboard.kpi.currentMembersTrend")}
                                stroke="#184e52"
                                {...trendStrokeStyle}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            {!rows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const RevenueItemChart = ({ rows, t }) => {
    const [mode, setMode] = useState("revenue");
    const valueKey = mode === "units" ? "units" : "total";
    const modeLabel = mode === "units" ? t("dashboard.revenue.unitsSold") : t("dashboard.revenue.viewRevenue");
    const modeTotal = (rows || []).reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);
    const chartRows = (rows || [])
        .map((row) => ({
            label: row.name || "N/A",
            total: Number(row.total || 0),
            count: Number(row.count || 0),
            units: Number(row.units || row.count || 0),
            percentage: modeTotal ? Number(row[valueKey] || 0) / modeTotal * 100 : 0,
        }))
        .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))
        .slice(0, 10);
    const chartHeight = Math.max(360, chartRows.length * 54 + 90);

    return (
        <Paper style={{ padding: "16px" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap" style={{ marginBottom: "8px" }}>
                <h2 style={{ margin: 0 }}>{mode === "units" ? t("dashboard.charts.unitsSoldByItem") : t("dashboard.revenue.byItem")}</h2>
                <TextField
                    select
                    size="small"
                    label={t("common.view")}
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                    style={{ minWidth: 150 }}
                >
                    <MenuItem value="revenue">{t("dashboard.revenue.viewRevenue")}</MenuItem>
                    <MenuItem value="units">{t("dashboard.revenue.unitsSold")}</MenuItem>
                </TextField>
            </Stack>
            <div style={{ width: "100%", height: chartHeight }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 32, bottom: 16, left: 12 }}>
                        <CartesianGrid stroke="#eef1f4" horizontal={false} />
                        <XAxis
                            type="number"
                            tickFormatter={mode === "units" ? formatNumber : formatCompactMoney}
                            tick={chartText}
                        />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={240}
                            tick={chartText}
                            tickFormatter={(value) => truncateLabel(value, 32)}
                        />
                        <ChartTooltip
                            formatter={(value, name, item) => {
                                const percent = formatPercentOneDecimal(Number(item?.payload?.percentage || 0));
                                const formattedValue = mode === "units" ? formatNumber(value) : formatMoney(value);
                                return [`${formattedValue} (${percent})`, modeLabel];
                            }}
                            labelFormatter={(value) => value}
                            contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey={valueKey} name={modeLabel} fill="#2f6f73" radius={[0, 4, 4, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const RevenueHealthTrendChart = ({ rows, t }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = showTrend ? addLinearTrendLines(rows, ["average_ticket"]) : rows;
    return (
        <>
            <TrendToggle checked={showTrend} onChange={setShowTrend} label={t("common.trendLine")} />
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis yAxisId="money" tick={chartText} tickFormatter={formatCompactMoney} />
                        <YAxis yAxisId="ticket" orientation="right" tick={chartText} tickFormatter={formatCompactMoney} />
                        <ChartTooltip
                            formatter={(value, name, item) => {
                                if (name === "sales_revenue") return [formatMoney(value), t("dashboard.kpi.salesRevenue")];
                                if (name === "average_ticket") return [formatMoney(value), t("dashboard.kpi.averageTicket")];
                                if (name === "average_ticket_trend") return [formatMoney(value), t("dashboard.kpi.averageTicketTrend")];
                                return [formatMoney(value), name];
                            }}
                            contentStyle={expandedChartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar yAxisId="money" dataKey="sales_revenue" name={t("dashboard.kpi.salesRevenue")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                        <Line
                            yAxisId="ticket"
                            type="monotone"
                            dataKey="average_ticket"
                            name={t("dashboard.kpi.averageTicket")}
                            stroke="#8a5cf6"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                yAxisId="ticket"
                                type="monotone"
                                dataKey="average_ticket_trend"
                                name={t("dashboard.kpi.averageTicketTrend")}
                                stroke="#4b5563"
                                {...trendStrokeStyle}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};


export const RetentionHealthTrendChart = ({ rows, t }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = showTrend ? addLinearTrendLines(rows, ["renewal_rate"]) : rows;
    return (
        <>
            <TrendToggle checked={showTrend} onChange={setShowTrend} label={t("common.trendLine")} />
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis yAxisId="rate" tick={chartText} tickFormatter={(value) => `${value}%`} />
                        <YAxis yAxisId="members" orientation="right" allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value, name) => {
                                if (name === "renewal_rate") return [`${formatNumber(value)}%`, t("dashboard.kpi.renewalRate")];
                                if (name === "renewal_rate_trend") return [`${formatNumber(value)}%`, t("dashboard.kpi.renewalRateTrend")];
                                if (name === "not_renewed_members") return [formatNumber(value), t("dashboard.kpi.notRenewed")];
                                if (name === "not_renewed_unassigned_studio") return [formatNumber(value), t("dashboard.kpi.unassignedStudio")];
                                return [formatNumber(value), name];
                            }}
                            contentStyle={expandedChartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar yAxisId="members" dataKey="not_renewed_members" name={t("dashboard.kpi.notRenewed")} fill="#b42318" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="members" dataKey="not_renewed_unassigned_studio" name={t("dashboard.kpi.unassignedStudio")} fill="#d97706" radius={[4, 4, 0, 0]} />
                        <Line
                            yAxisId="rate"
                            type="monotone"
                            dataKey="renewal_rate"
                            name={t("dashboard.kpi.renewalRate")}
                            stroke="#2f6f73"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                yAxisId="rate"
                                type="monotone"
                                dataKey="renewal_rate_trend"
                                name={t("dashboard.kpi.renewalRateTrend")}
                                stroke="#4b5563"
                                {...trendStrokeStyle}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};


export const MemberMixHistoryChart = ({ rows, view, t }) => {
    const trendKeys = view === "renewal" ? ["renewal_rate"] : [];
    const [showTrend, setShowTrend] = useState(false);
    const mixTotals = {};
    (rows || []).forEach((row) => {
        (row.current_member_mix || []).forEach((item) => {
            const name = item.name || "N/A";
            mixTotals[name] = (mixTotals[name] || 0) + Number(item.total || 0);
        });
    });
    const topMixNames = Object.entries(mixTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
    const mixKeys = [...topMixNames, t("common.other", "Others")].map((name, index) => ({
        key: `member_mix_${index}`,
        name,
        color: memberMixColors[index],
    }));
    const memberMixRows = (rows || []).map((row) => {
        const nextRow = { ...row };
        const mixLookup = {};
        (row.current_member_mix || []).forEach((item) => {
            mixLookup[item.name || "N/A"] = Number(item.total || 0);
        });
        topMixNames.forEach((name, index) => {
            nextRow[`member_mix_${index}`] = mixLookup[name] || 0;
        });
        nextRow[`member_mix_${topMixNames.length}`] = Object.entries(mixLookup).reduce((sum, [name, total]) => (
            topMixNames.includes(name) ? sum : sum + total
        ), 0);
        return nextRow;
    });
    const chartRows = view === "members"
        ? memberMixRows
        : showTrend && trendKeys.length
            ? addLinearTrendLines(rows, trendKeys)
            : rows;
    return (
        <>
            {trendKeys.length > 0 && <TrendToggle checked={showTrend} onChange={setShowTrend} label={t("common.trendLine")} />}
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        {view === "renewal" ? (
                            <YAxis tick={chartText} tickFormatter={(value) => `${value}%`} />
                        ) : (
                            <YAxis allowDecimals={false} tick={chartText} />
                        )}
                        <ChartTooltip
                            formatter={(value, name, item) => {
                                if (name === "renewal_rate") return [`${formatNumber(value)}%`, t("dashboard.kpi.renewalRate")];
                                if (name === "renewal_rate_trend") return [`${formatNumber(value)}%`, t("dashboard.kpi.renewalRateTrend")];
                                if (name === "retained_members") return [formatNumber(value), t("dashboard.kpi.retained")];
                                if (name === "new_members") return [formatNumber(value), t("dashboard.kpi.new")];
                                if (name === "reactivated_members") return [formatNumber(value), t("dashboard.kpi.reactivated")];
                                if (name === "not_renewed_members") return [formatNumber(value), t("dashboard.kpi.notRenewed")];
                                if (String(item?.dataKey || "").startsWith("member_mix_")) {
                                    const total = item?.payload?.current_members || 0;
                                    const percent = total ? (Number(value || 0) / Number(total)) * 100 : 0;
                                    return [`${formatNumber(value)} (${formatPercentOneDecimal(percent)})`, name];
                                }
                                return [formatNumber(value), name];
                            }}
                            contentStyle={expandedChartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        {view === "members" && (
                            <>
                                {mixKeys.map((item, index) => (
                                    <Bar
                                        key={item.key}
                                        dataKey={item.key}
                                        name={item.name}
                                        stackId="members"
                                        fill={item.color}
                                        radius={index === mixKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                        label={(props) => <StackedPercentLabel {...props} />}
                                    >
                                        {index === mixKeys.length - 1 && (
                                            <LabelList dataKey="current_members" content={<StackedTotalLabel />} />
                                        )}
                                    </Bar>
                                ))}
                            </>
                        )}
                        {view === "renewal" && (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="renewal_rate"
                                    name={t("dashboard.kpi.renewalRate")}
                                    stroke="#2f6f73"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                {showTrend && (
                                    <Line
                                        type="monotone"
                                        dataKey="renewal_rate_trend"
                                        name={t("dashboard.kpi.renewalRateTrend")}
                                        stroke="#4b5563"
                                        {...trendStrokeStyle}
                                    />
                                )}
                            </>
                        )}
                        {view === "movement" && (
                            <>
                                <Bar dataKey="new_members" name={t("dashboard.kpi.new")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="reactivated_members" name={t("dashboard.kpi.reactivated")} fill="#8a5cf6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="not_renewed_members" name={t("dashboard.kpi.notRenewed")} fill="#b42318" radius={[4, 4, 0, 0]} />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};


export const CompletedVisitsRankingChart = ({ title, rows, limit = 10, wide = false, t }) => {
    const chartRows = (rows || []).slice(0, limit).map((row) => ({
        label: row.name || "N/A",
        total: Number(row.total || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 8, bottom: 48, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis
                            dataKey="label"
                            interval={0}
                            angle={-28}
                            textAnchor="end"
                            height={58}
                            tick={chartText}
                            tickFormatter={(value) => truncateLabel(value, 12)}
                        />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value) => [formatNumber(value), t("dashboard.kpi.completedVisits")]}
                            labelFormatter={(value) => value}
                            contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey="total" name={t("dashboard.kpi.completedVisits")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const CompletedVisitsByHourChart = ({ rows, wide = false, action, t }) => {
    const chartRows = (rows || []).map((row) => ({
        hour: row.hour || "N/A",
        total: Number(row.total || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap" style={{ marginBottom: "8px" }}>
                <h2 style={{ margin: 0 }}>{t("dashboard.charts.completedVisitsByHour")}</h2>
                {action}
            </Stack>
            <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 8, bottom: 28, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis
                            dataKey="hour"
                            interval={0}
                            angle={-28}
                            textAnchor="end"
                            height={42}
                            tick={chartText}
                        />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip formatter={(value) => [formatNumber(value), t("dashboard.kpi.completedVisits")]} contentStyle={chartTooltipStyle} />
                        <Bar dataKey="total" name={t("dashboard.kpi.completedVisits")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const WeeklyAttendanceComparisonChart = ({ rows, wide = false, action, t }) => (
    <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>{t("dashboard.charts.completedVisitsVsPreviousWeek")}</h2>
            {action}
        </Stack>
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" tick={chartText} />
                    <YAxis allowDecimals={false} tick={chartText} />
                    <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={chartLegendStyle} />
                    <Bar dataKey="previous" name={t("common.previousWeek")} fill="#8a5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" name={t("common.selectedWeek")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
        {!rows.length && <div>{t("common.noData")}</div>}
    </Paper>
);


export const BookingQualityChart = ({ rows, wide = false, action, t }) => {
    const chartRows = (rows || []).map((row) => ({
        label: formatShortWeekdayDate(row.date, t),
        attended: Number(row.attended || 0),
        no_shows: Number(row.no_shows || 0),
        late_cancels: Number(row.late_cancels || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
                <h2 style={{ margin: 0 }}>{t("dashboard.charts.bookingQualityByDay")}</h2>
                {action}
            </Stack>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={chartTooltipStyle} />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="attended" name={t("dashboard.kpi.completedVisits")} stackId="bookings" fill={completedColor} />
                        <Bar dataKey="late_cancels" name={t("dashboard.kpi.lateCancels")} stackId="bookings" fill={attentionColor} />
                        <Bar dataKey="no_shows" name={t("dashboard.kpi.noShows")} stackId="bookings" fill="#b42318" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const WeeklyAttendanceHealthTrendChart = ({ rows, view, t }) => {
    const trendKeys = view === "rates"
        ? ["late_cancel_rate", "no_show_rate"]
        : view === "revenue"
            ? ["average_revenue_per_attended_visit"]
            : [];
    const [showTrend, setShowTrend] = useState(false);
    const baseRows = rows.map((row) => ({
        ...row,
        not_completed_bookings: Math.max(0, Number(row.total_bookings || 0) - Number(row.completed_visits || 0)),
    }));
    const chartRows = showTrend && trendKeys.length ? addLinearTrendLines(baseRows, trendKeys) : baseRows;
    return (
        <>
            {trendKeys.length > 0 && <TrendToggle checked={showTrend} onChange={setShowTrend} label={t("common.trendLine")} />}
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis
                            tick={chartText}
                            tickFormatter={
                                view === "rates"
                                    ? (value) => `${value}%`
                                    : view === "revenue"
                                        ? formatCompactMoney
                                        : undefined
                            }
                        />
                        <ChartTooltip
                            formatter={(value, name) => {
                                if (name === "no_show_rate") return [`${formatNumber(value)}%`, t("dashboard.kpi.noShowRate")];
                                if (name === "no_show_rate_trend") return [`${formatNumber(value)}%`, `${t("dashboard.kpi.noShowRate")} ${t("common.trend")}`];
                                if (name === "late_cancel_rate") return [`${formatNumber(value)}%`, t("dashboard.kpi.lateCancelRate")];
                                if (name === "late_cancel_rate_trend") return [`${formatNumber(value)}%`, `${t("dashboard.kpi.lateCancelRate")} ${t("common.trend")}`];
                                if (name === "average_revenue_per_attended_visit") return [formatMoney(value), t("dashboard.kpi.avgRevenueVisit")];
                                if (name === "average_revenue_per_attended_visit_trend") return [formatMoney(value), `${t("dashboard.kpi.avgRevenueVisit")} ${t("common.trend")}`];
                                if (name === "total_bookings") return [formatNumber(value), t("dashboard.kpi.totalBookings")];
                                if (name === "completed_visits") return [formatNumber(value), t("dashboard.kpi.completedVisits")];
                                if (name === "not_completed_bookings") return [formatNumber(value), t("dashboard.kpi.bookedNotCompleted")];
                                return [formatNumber(value), name];
                            }}
                            contentStyle={expandedChartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        {view === "visits" ? (
                            <>
                                <Bar dataKey="completed_visits" name={t("dashboard.kpi.completedVisits")} stackId="bookings" fill={completedColor} />
                                <Bar dataKey="not_completed_bookings" name={t("dashboard.kpi.bookedNotCompleted")} stackId="bookings" fill={attentionColor} radius={[4, 4, 0, 0]} />
                            </>
                        ) : view === "rates" ? (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="late_cancel_rate"
                                    name={t("dashboard.kpi.lateCancelRate")}
                                    stroke="#d97706"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                {showTrend && (
                                    <Line
                                        type="monotone"
                                        dataKey="late_cancel_rate_trend"
                                        name={`${t("dashboard.kpi.lateCancelRate")} ${t("common.trend")}`}
                                        stroke="#92400e"
                                        {...trendStrokeStyle}
                                    />
                                )}
                                <Line
                                    type="monotone"
                                    dataKey="no_show_rate"
                                    name={t("dashboard.kpi.noShowRate")}
                                    stroke="#b42318"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                {showTrend && (
                                    <Line
                                        type="monotone"
                                        dataKey="no_show_rate_trend"
                                        name={`${t("dashboard.kpi.noShowRate")} ${t("common.trend")}`}
                                        stroke="#7f1d1d"
                                        {...trendStrokeStyle}
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="average_revenue_per_attended_visit"
                                    name={t("dashboard.kpi.avgRevenueVisit")}
                                    stroke="#2f6f73"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                {showTrend && (
                                    <Line
                                        type="monotone"
                                        dataKey="average_revenue_per_attended_visit_trend"
                                        name={`${t("dashboard.kpi.avgRevenueVisit")} ${t("common.trend")}`}
                                        stroke="#4b5563"
                                        {...trendStrokeStyle}
                                    />
                                )}
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};


export const WeeklyOccupancyHealthTrendChart = ({ rows, view, t }) => {
    const [showTrend, setShowTrend] = useState(false);
    const baseRows = rows.map((row) => ({
        ...row,
        unused_capacity: Math.max(0, Number(row.scheduled_capacity || 0) - Number(row.attendance_used || 0)),
        occupation_label: formatPercent(row.occupation_rate),
    }));
    const chartRows = showTrend && view === "rate" ? addLinearTrendLines(baseRows, ["occupation_rate"]) : baseRows;
    return (
        <>
            {view === "rate" && <TrendToggle checked={showTrend} onChange={setShowTrend} label={t("common.trendLine")} />}
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 28, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis tick={chartText} tickFormatter={view === "rate" ? (value) => `${value}%` : undefined} />
                        <ChartTooltip
                            formatter={(value, name) => {
                                if (name === "occupation_rate") return [`${formatNumber(value)}%`, t("common.occupancy")];
                                if (name === "occupation_rate_trend") return [`${formatNumber(value)}%`, `${t("common.occupancy")} ${t("common.trend")}`];
                                if (name === "scheduled_capacity") return [formatNumber(value), t("dashboard.kpi.scheduledCapacity")];
                                if (name === "attendance_used") return [formatNumber(value), t("dashboard.kpi.attendanceUsed")];
                                if (name === "unused_capacity") return [formatNumber(value), t("dashboard.kpi.unusedCapacity")];
                                if (name === "scheduled_classes") return [formatNumber(value), t("dashboard.kpi.scheduledClasses")];
                                return [formatNumber(value), name];
                            }}
                            contentStyle={expandedChartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        {view === "capacity" ? (
                            <>
                                <Bar dataKey="attendance_used" name={t("dashboard.kpi.attendanceUsed")} stackId="capacity" fill={completedColor} />
                                <Bar dataKey="unused_capacity" name={t("dashboard.kpi.unusedCapacity")} stackId="capacity" fill={unusedCapacityColor} radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="occupation_label" position="top" style={chartLabelStyle} />
                                </Bar>
                            </>
                        ) : view === "classes" ? (
                            <Bar dataKey="scheduled_classes" name={t("dashboard.kpi.scheduledClasses")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                        ) : (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="occupation_rate"
                                    name={t("common.occupancy")}
                                    stroke="#2f6f73"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                {showTrend && (
                                    <Line
                                        type="monotone"
                                        dataKey="occupation_rate_trend"
                                        name={`${t("common.occupancy")} ${t("common.trend")}`}
                                        stroke="#4b5563"
                                        {...trendStrokeStyle}
                                    />
                                )}
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};


export const WeeklyWeekdayDrilldownChart = ({ rows, metric, t }) => (
    <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
            <ComposedChart
                data={rows.map((row) => ({
                    ...row,
                    not_completed_bookings: Math.max(0, Number(row.total_bookings || 0) - Number(row.completed_visits || 0)),
                    unused_capacity: Math.max(0, Number(row.scheduled_capacity || 0) - Number(row.attendance_used || 0)),
                    occupation_label: formatPercent(row.occupation_rate),
                }))}
                margin={{ top: metric === "occupancy" ? 28 : 16, right: 24, bottom: 8, left: 8 }}
            >
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={chartText} />
                <YAxis tick={chartText} />
                <ChartTooltip
                    formatter={(value, name) => {
                        if (name === "completed_visits") return [formatNumber(value), t("dashboard.kpi.completedVisits")];
                        if (name === "not_completed_bookings") return [formatNumber(value), t("dashboard.kpi.bookedNotCompleted")];
                        if (name === "total_bookings") return [formatNumber(value), t("dashboard.kpi.totalBookings")];
                        if (name === "scheduled_capacity") return [formatNumber(value), t("dashboard.kpi.scheduledCapacity")];
                        if (name === "occupation_rate") return [`${formatNumber(value)}%`, t("common.occupancy")];
                        if (name === "attendance_used") return [formatNumber(value), t("dashboard.kpi.attendanceUsed")];
                        if (name === "unused_capacity") return [formatNumber(value), t("dashboard.kpi.unusedCapacity")];
                        return [formatNumber(value), name];
                    }}
                    contentStyle={expandedChartTooltipStyle}
                />
                <Legend wrapperStyle={chartLegendStyle} />
                {metric === "attendance" ? (
                    <>
                        <Bar dataKey="completed_visits" name={t("dashboard.kpi.completedVisits")} stackId="bookings" fill={completedColor} />
                        <Bar dataKey="not_completed_bookings" name={t("dashboard.kpi.bookedNotCompleted")} stackId="bookings" fill={attentionColor} radius={[4, 4, 0, 0]} />
                    </>
                ) : (
                    <>
                        <Bar dataKey="attendance_used" name={t("dashboard.kpi.attendanceUsed")} stackId="capacity" fill={completedColor} />
                        <Bar dataKey="unused_capacity" name={t("dashboard.kpi.unusedCapacity")} stackId="capacity" fill={unusedCapacityColor} radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="occupation_label" position="top" style={chartLabelStyle} />
                        </Bar>
                    </>
                )}
            </ComposedChart>
        </ResponsiveContainer>
    </div>
);


export const BookingQualityWeekdayHistoryChart = ({ rows, t }) => (
    <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
            <RechartsBarChart data={rows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={chartText} />
                <YAxis allowDecimals={false} tick={chartText} />
                <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={expandedChartTooltipStyle} />
                <Legend wrapperStyle={chartLegendStyle} />
                <Bar dataKey="completed_visits" name={t("dashboard.kpi.completedVisits")} stackId="bookings" fill={completedColor} />
                <Bar dataKey="late_cancels" name={t("dashboard.kpi.lateCancels")} stackId="bookings" fill={attentionColor} />
                <Bar dataKey="no_shows" name={t("dashboard.kpi.noShows")} stackId="bookings" fill="#b42318" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
        </ResponsiveContainer>
    </div>
);


export const WeeklyOccupancyComparisonChart = ({ rows, wide = false, action, t }) => (
    <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>{t("dashboard.charts.occupancyVsPreviousWeek")}</h2>
            {action}
        </Stack>
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" tick={chartText} />
                    <YAxis tick={chartText} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip formatter={(value) => `${formatNumber(value)}%`} contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={chartLegendStyle} />
                    <Bar dataKey="previous" name={t("common.previousWeek")} fill="#8a5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" name={t("common.selectedWeek")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
        {!rows.length && <div>{t("common.noData")}</div>}
    </Paper>
);


export const OccupancyCapacityByDayChart = ({ rows, action, t }) => {
    const chartRows = (rows || []).map((row) => {
        const capacity = Number(row.capacity || 0);
        const attended = Number(row.attended || 0);
        return {
            label: formatShortWeekdayDate(row.date, t),
            attended,
            unused_capacity: Math.max(0, capacity - attended),
            capacity,
            occupation_rate: Number(row.occupation_rate || 0),
            occupation_label: formatPercent(row.occupation_rate),
        };
    });

    return (
        <Paper style={{ padding: "16px" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap" style={{ marginBottom: "8px" }}>
                <h2 style={{ margin: 0 }}>{t("dashboard.charts.capacityUsedByDay")}</h2>
                {action}
            </Stack>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value, name) => {
                                if (name === "attended") return [formatNumber(value), t("dashboard.kpi.attendanceUsed")];
                                if (name === "unused_capacity") return [formatNumber(value), t("dashboard.kpi.unusedCapacity")];
                                return [formatNumber(value), name];
                            }}
                            labelFormatter={(label, payload) => {
                                const row = payload?.[0]?.payload;
                                return row ? `${label} - ${formatPercent(row.occupation_rate)}` : label;
                            }}
                            contentStyle={chartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="attended" name={t("dashboard.kpi.attendanceUsed")} stackId="capacity" fill={completedColor} />
                        <Bar dataKey="unused_capacity" name={t("dashboard.kpi.unusedCapacity")} stackId="capacity" fill={unusedCapacityColor} radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const OccupancyHourMatrix = ({ data, view, weekday, t }) => {
    const source = view === "history" ? data?.weekday_history : data?.current_week;
    const selectedDays = (source?.days || []).filter((day) => view !== "history" || day.weekday === weekday);
    const selectedDates = new Set(selectedDays.map((day) => day.date));
    const cells = (source?.cells || []).filter((cell) => selectedDates.has(cell.date));
    const activeHours = (source?.hours || []).filter((hour) => cells.some((cell) => cell.hour === hour));
    const cellLookup = cells.reduce((lookup, cell) => {
        lookup[`${cell.date}-${cell.hour}`] = cell;
        return lookup;
    }, {});

    if (!selectedDays.length || !activeHours.length) {
        return <div style={{ padding: "24px 0", color: "#64748b" }}>{t("dashboard.empty.noScheduledClasses")}</div>;
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `minmax(150px, 1.2fr) repeat(${activeHours.length}, minmax(96px, 1fr))`,
                    minWidth: Math.max(720, 150 + activeHours.length * 96),
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    overflow: "hidden",
                }}
            >
                <div style={{ padding: "12px", background: "#f8fafc", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>
                    {t("dashboard.matrix.day")}
                </div>
                {activeHours.map((hour) => (
                    <div
                        key={hour}
                        style={{
                            padding: "12px 10px",
                            background: "#f8fafc",
                            fontWeight: 800,
                            textAlign: "center",
                            borderBottom: "1px solid #e2e8f0",
                            borderLeft: "1px solid #e2e8f0",
                        }}
                    >
                        {hour}
                    </div>
                ))}
                {selectedDays.map((day) => (
                    <div key={day.date} style={{ display: "contents" }}>
                        <div
                            style={{
                                padding: "12px",
                                fontWeight: 800,
                                borderTop: "1px solid #e2e8f0",
                                background: "#fff",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            {day.label || formatShortWeekdayDate(day.date, t)}
                        </div>
                        {activeHours.map((hour) => {
                            const cell = cellLookup[`${day.date}-${hour}`];
                            return (
                                <div
                                    key={`${day.date}-${hour}`}
                                    title={cell ? `${formatPercent(cell.occupation_rate)} ${t("dashboard.matrix.occupancy")} - ${formatNumber(cell.attended)} / ${formatNumber(cell.scheduled_capacity)}` : t("dashboard.matrix.noScheduledClass")}
                                    style={{
                                        minHeight: 74,
                                        padding: "10px 8px",
                                        textAlign: "center",
                                        borderTop: "1px solid #e2e8f0",
                                        borderLeft: "1px solid #e2e8f0",
                                        background: cell ? occupancyHeatColor(cell.occupation_rate) : occupancyEmptyColor,
                                        color: cell ? "#172033" : "#94a3b8",
                                        display: "grid",
                                        alignContent: "center",
                                        gap: 4,
                                    }}
                                >
                                    {cell ? (
                                        <>
                                            <div style={{ fontSize: 19, fontWeight: 900 }}>{formatPercent(cell.occupation_rate)}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                                                {formatNumber(cell.attended)} / {formatNumber(cell.scheduled_capacity)}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#475569" }}>
                                                {formatNumber(cell.scheduled_classes)} {Number(cell.scheduled_classes) === 1 ? t("dashboard.matrix.classSingular") : t("dashboard.matrix.classPlural")}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>-</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap style={{ marginTop: 12, color: "#475569", fontSize: 13 }}>
                <span><strong>{t("dashboard.matrix.cell")}:</strong> {t("dashboard.matrix.occupancyPercentage")}</span>
                <span><strong>{t("dashboard.matrix.detail")}:</strong> {t("dashboard.matrix.attendedCapacity")}</span>
                <span><strong>{t("dashboard.matrix.blank")}:</strong> {t("dashboard.matrix.noClass")}</span>
            </Stack>
        </div>
    );
};


export const TrialConversionFunnelChart = ({ conversion, t }) => {
    const trialClients = Number(conversion?.unique_trial_clients || 0);
    const chartRows = [
        { label: t("dashboard.kpi.trialClients"), total: trialClients },
        { label: t("dashboard.kpi.members"), total: Number(conversion?.converted_members || 0) },
        { label: t("dashboard.kpi.nonMemberClients"), total: Number(conversion?.converted_non_members || 0) },
        { label: t("dashboard.kpi.notConverted"), total: Number(conversion?.not_converted_clients || 0) },
    ].map((row) => ({
        ...row,
        percent: trialClients ? (row.total / trialClients) * 100 : 0,
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: "span 2" }}>
            <h2 style={{ marginTop: 0 }}>{t("dashboard.charts.trialConversionFunnel")}</h2>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 20, right: 24, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value, name, item) => [
                                `${formatNumber(value)} (${formatPercentOneDecimal(item?.payload?.percent || 0)})`,
                                t("dashboard.kpi.clients"),
                            ]}
                            contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey="total" name={t("dashboard.kpi.clients")} fill="#2f6f73" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="total" position="top" style={chartLabelStyle} formatter={formatNumber} />
                        </Bar>
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!trialClients && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const TrialActivityByDateChart = ({ rows, t }) => {
    const chartRows = (rows || []).map((row) => ({
        label: formatShortWeekdayDate(row.date, t),
        attended: Number(row.attended || 0),
        late_cancels: Number(row.late_cancels || 0),
        no_shows: Number(row.no_shows || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: "span 2" }}>
            <h2 style={{ marginTop: 0 }}>{t("dashboard.charts.trialActivityByDate")}</h2>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={chartTooltipStyle} />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="attended" name={t("dashboard.kpi.trialVisits")} stackId="trial" fill={completedColor} />
                        <Bar dataKey="late_cancels" name={t("dashboard.kpi.lateCancels")} stackId="trial" fill={attentionColor} />
                        <Bar dataKey="no_shows" name={t("dashboard.kpi.noShows")} stackId="trial" fill="#b42318" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const TrialConversionRankingChart = ({ title, rows, t }) => {
    const chartRows = (rows || []).slice(0, 10).map((row) => ({
        label: row.name || "N/A",
        trial_clients: Number(row.trial_clients || 0),
        converted_clients: Number(row.converted_clients || 0),
        converted_members: Number(row.converted_members || 0),
        converted_non_members: Number(row.converted_non_members || 0),
        not_converted_clients: Number(row.not_converted_clients || 0),
        member_conversion_rate: Number(row.member_conversion_rate || 0),
    }));
    const renderTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        const row = payload[0]?.payload || {};
        return (
            <div style={{ ...chartTooltipStyle, background: "#fff", padding: "10px 12px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
                <div style={{ display: "grid", gap: 4 }}>
                    <div><strong>{t("dashboard.kpi.memberConversion")}:</strong> {formatPercentOneDecimal(row.member_conversion_rate)}</div>
                    <div><strong>{t("dashboard.kpi.memberConversions")}:</strong> {formatNumber(row.converted_members)}</div>
                    <div><strong>{t("dashboard.kpi.nonMemberConversions")}:</strong> {formatNumber(row.converted_non_members)}</div>
                    <div><strong>{t("dashboard.kpi.notConverted")}:</strong> {formatNumber(row.not_converted_clients)}</div>
                    <div><strong>{t("dashboard.kpi.trialVisits")}:</strong> {formatNumber(row.trial_clients)}</div>
                </div>
            </div>
        );
    };

    return (
        <Paper style={{ padding: "16px" }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 8, bottom: 48, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis
                            dataKey="label"
                            interval={0}
                            angle={-28}
                            textAnchor="end"
                            height={58}
                            tick={chartText}
                            tickFormatter={(value) => truncateLabel(value, 12)}
                        />
                        <YAxis tick={chartText} tickFormatter={(value) => `${value}%`} />
                        <ChartTooltip content={renderTooltip} />
                        <Bar dataKey="member_conversion_rate" name={t("dashboard.kpi.memberConversion")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>{t("common.noData")}</div>}
        </Paper>
    );
};


export const ConversionTrendChart = ({ rows, view, t }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = view === "rates" && showTrend
        ? addLinearTrendLines(rows, ["member_conversion_rate", "non_member_conversion_rate"])
        : rows;
    return (
        <>
            {view === "rates" && <TrendToggle checked={showTrend} onChange={setShowTrend} label={t("common.trendLine")} />}
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        {view === "rates" ? (
                            <YAxis tick={chartText} tickFormatter={(value) => `${value}%`} />
                        ) : (
                            <YAxis allowDecimals={false} tick={chartText} />
                        )}
                        <ChartTooltip
                            formatter={(value, name, item) => {
                                if (String(item?.dataKey || "").includes("rate")) return [formatPercentOneDecimal(value), name];
                                return [formatNumber(value), name];
                            }}
                            contentStyle={expandedChartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        {view === "activity" ? (
                            <>
                                <Bar dataKey="attended_trials" name={t("dashboard.kpi.trialVisits")} fill="#2f6f73" radius={[4, 4, 0, 0]} />
                            </>
                        ) : (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="member_conversion_rate"
                                    name={t("dashboard.kpi.memberConversionRate")}
                                    stroke="#2f6f73"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="non_member_conversion_rate"
                                    name={t("dashboard.kpi.nonMemberConversionRate")}
                                    stroke="#d97706"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                {showTrend && (
                                    <>
                                        <Line
                                            type="monotone"
                                            dataKey="member_conversion_rate_trend"
                                            name={t("dashboard.kpi.memberConversionTrend")}
                                            stroke="#184e52"
                                            {...trendStrokeStyle}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="non_member_conversion_rate_trend"
                                            name={t("dashboard.kpi.nonMemberConversionTrend")}
                                            stroke="#92400e"
                                            {...trendStrokeStyle}
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};


export const TrialConversionTable = ({ rows }) => (
    <Paper style={{ padding: "16px", gridColumn: "1 / -1" }}>
        <h2 style={{ marginTop: 0 }}>Trial Client Follow-up</h2>
        <TableContainer style={{ maxHeight: 460 }}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Client</TableCell>
                        <TableCell>Trial Date</TableCell>
                        <TableCell>Studio</TableCell>
                        <TableCell>Instructor</TableCell>
                        <TableCell>Trial Service</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Conversion Service</TableCell>
                        <TableCell align="right">Days</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${row.client_id}-${row.trial_date}-${index}`}>
                            <TableCell>{row.client || "N/A"}</TableCell>
                            <TableCell>{formatShortWeekdayDate(row.trial_date)}</TableCell>
                            <TableCell>{row.studio || "N/A"}</TableCell>
                            <TableCell>{row.instructor || "N/A"}</TableCell>
                            <TableCell>{row.trial_service || "N/A"}</TableCell>
                            <TableCell>
                                {row.converted_to_member
                                    ? "Member"
                                    : row.converted_to_client
                                        ? "Paid client"
                                        : "Pending"}
                            </TableCell>
                            <TableCell>{row.membership_service || row.conversion_service || "N/A"}</TableCell>
                            <TableCell align="right">
                                {row.days_to_conversion === null || row.days_to_conversion === undefined
                                    ? ""
                                    : formatNumber(row.days_to_conversion)}
                            </TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={8}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


export const ConversionDashboardSection = ({ conversion, comparisonConversion, periodLabel, mode, onOpenTrend, t }) => {
    const trialClients = Number(conversion?.unique_trial_clients || 0);
    const memberRate = conversion?.member_conversion_rate || 0;
    const nonMemberRate = conversion?.non_member_conversion_rate || 0;
    return (
        <>
            {Number(conversion?.tracked_trial_options || 0) === 0 && (
                <Alert severity="warning">
                    No trial-class price options are marked yet. Mark them in Data &gt; Pricing Options.
                </Alert>
            )}
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <KpiCard
                    label={t("dashboard.kpi.trialVisits")}
                    value={formatNumber(conversion?.attended_trials)}
                    action={<Button variant="outlined" size="small" onClick={() => onOpenTrend("activity")}>{t("common.trend")}</Button>}
                />
                <KpiCard label={t("dashboard.kpi.trialClients")} value={formatNumber(trialClients)} />
                <KpiCard
                    label={t("dashboard.kpi.memberConversion")}
                    value={formatPercent(memberRate)}
                    action={(
                        <Stack spacing={0.5} alignItems="flex-end">
                            <Button variant="outlined" size="small" onClick={() => onOpenTrend("rates")}>{t("common.trend")}</Button>
                            {comparisonConversion && (
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                                    {comparisonDelta(memberRate, comparisonConversion.member_conversion_rate, {
                                        periodLabel,
                                        decimals: 1,
                                        suffix: " pts",
                                        previousLabel: `vs ${t("common.previousPeriod")}`,
                                    }).label}
                                </span>
                            )}
                        </Stack>
                    )}
                />
                <KpiCard
                    label={t("dashboard.kpi.nonMemberConversion")}
                    value={formatPercent(nonMemberRate)}
                    action={(
                        <Stack spacing={0.5} alignItems="flex-end">
                            <Button variant="outlined" size="small" onClick={() => onOpenTrend("rates")}>{t("common.trend")}</Button>
                            {comparisonConversion && (
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                                    {comparisonDelta(nonMemberRate, comparisonConversion.non_member_conversion_rate, {
                                        periodLabel,
                                        decimals: 1,
                                        suffix: " pts",
                                        previousLabel: `vs ${t("common.previousPeriod")}`,
                                    }).label}
                                </span>
                            )}
                        </Stack>
                    )}
                />
                <KpiCard label={t("dashboard.kpi.notConverted")} value={formatNumber(conversion?.not_converted_clients)} />
                <KpiCard label={t("dashboard.kpi.avgDaysToConvert")} value={formatNumber(Number(conversion?.average_days_to_conversion || 0).toFixed(1))} />
            </div>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                <TrialConversionFunnelChart conversion={conversion} t={t} />
                {mode === "weekly" && <TrialActivityByDateChart rows={conversion?.by_date} t={t} />}
                <TrialConversionRankingChart title={t("dashboard.charts.trialConversionByInstructor")} rows={conversion?.by_instructor} t={t} />
                <TrialConversionRankingChart title={t("dashboard.charts.trialConversionByStudio")} rows={conversion?.by_studio} t={t} />
                <TrialConversionTable rows={conversion?.rows} />
            </div>
        </>
    );
};


export const BarChart = ({ title, rows, labelKey = "date", valueKey = "total", money = false, limit = 31 }) => {
    const chartRows = (rows || []).slice(-limit);
    const maxValue = Math.max(...chartRows.map((row) => Number(row[valueKey] || 0)), 0);

    return (
        <Paper style={{ padding: "16px" }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <div style={{ display: "grid", gap: "10px" }}>
                {chartRows.map((row, index) => {
                    const value = Number(row[valueKey] || 0);
                    const width = maxValue ? Math.max(4, (value / maxValue) * 100) : 0;
                    return (
                        <div key={`${title}-${index}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", alignItems: "center", gap: "10px" }}>
                            <div style={{ fontSize: "13px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {labelKey === "date" ? formatShortWeekdayDate(row[labelKey]) : row[labelKey] || "N/A"}
                            </div>
                            <div style={{ height: "12px", background: "#eef1f4", borderRadius: "6px", overflow: "hidden" }}>
                                <div style={{ width: `${width}%`, height: "100%", background: "#2f6f73" }} />
                            </div>
                            <div style={{ fontSize: "13px", textAlign: "right", fontWeight: 600 }}>
                                {money ? formatMoney(value) : formatNumber(value)}
                            </div>
                        </div>
                    );
                })}
                {!chartRows.length && <div>No data</div>}
            </div>
        </Paper>
    );
};


export const CapacityUsageCard = ({ occupation, action, t }) => {
    const capacity = Number(occupation?.scheduled_capacity || 0);
    const attended = Number(occupation?.matched_attended_visits || 0);
    const width = capacity ? Math.min(100, Math.max(0, (attended / capacity) * 100)) : 0;

    return (
        <Paper style={{ padding: "18px", display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ margin: 0 }}>{t("dashboard.cards.capacityUsed")}</h2>
                    <div style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>{t("dashboard.caption.occupancy")}</div>
                </div>
                <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" justifyContent="flex-end">
                    {action}
                    <strong style={{ fontSize: "30px" }}>{formatPercent(occupation?.occupation_rate)}</strong>
                </Stack>
            </div>
            <div style={{ height: "18px", background: "#eef1f4", borderRadius: "9px", overflow: "hidden" }}>
                <div style={{ width: `${width}%`, height: "100%", background: "#2f6f73" }} />
            </div>
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <div>
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>{t("dashboard.kpi.attendanceUsed")}</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(attended)}</div>
                </div>
                <div>
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>{t("dashboard.kpi.scheduledCapacity")}</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(capacity)}</div>
                </div>
                <div>
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>{t("dashboard.kpi.scheduledClasses")}</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(occupation?.available_classes)}</div>
                </div>
                <div>
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>{t("dashboard.kpi.closedUnavailable")}</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(occupation?.closed_or_unavailable_classes)}</div>
                </div>
            </div>
        </Paper>
    );
};

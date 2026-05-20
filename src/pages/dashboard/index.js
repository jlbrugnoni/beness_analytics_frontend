import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
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

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";


const chartText = { fontSize: 15 };
const chartTooltipStyle = { fontSize: 14, borderRadius: 6, borderColor: "#d8dee4" };
const expandedChartTooltipStyle = { fontSize: 17, borderRadius: 8, borderColor: "#d8dee4", padding: "12px 14px" };
const chartLegendStyle = { fontSize: 15, paddingTop: 8, color: "#2f3a45" };
const completedColor = "#2f6f73";
const attentionColor = "#d97706";
const unusedCapacityColor = "#d8dee4";
const chartLabelStyle = { fill: "#2f3a45", fontSize: 14, fontWeight: 700 };
const trendStrokeStyle = { strokeDasharray: "6 5", dot: false, activeDot: false, strokeWidth: 2.5 };
const occupancyEmptyColor = "#f6f8fa";
const memberMixColors = ["#2f6f73", "#8a5cf6", "#d97706", "#64748b"];


const occupancyHeatColor = (value) => {
    const rate = Math.max(0, Math.min(100, Number(value || 0)));
    if (rate === 0) return "#fecaca";
    if (rate < 35) return "#fef2f2";
    if (rate < 55) return "#ffedd5";
    if (rate < 75) return "#fef3c7";
    if (rate < 90) return "#dcfce7";
    return "#bbf7d0";
};


const trendKey = (key) => `${key}_trend`;


const addLinearTrendLines = (rows, keys) => {
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


const TrendToggle = ({ checked, onChange }) => (
    <Stack direction="row" justifyContent="flex-end">
        <FormControlLabel
            control={<Switch size="small" checked={checked} onChange={(event) => onChange(event.target.checked)} />}
            label="Trend line"
            sx={{
                marginRight: 0,
                ".MuiFormControlLabel-label": { fontSize: 15, fontWeight: 700, color: "#2f3a45" },
            }}
        />
    </Stack>
);


const StackedPercentLabel = ({ x, y, width, height, value, payload }) => {
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


const StackedTotalLabel = ({ x, y, width, value }) => {
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


const KpiCard = ({ label, value, action }) => (
    <Paper style={{ padding: "18px", minHeight: "96px", display: "grid", gap: "10px" }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
            <div style={{ color: "#555", fontSize: "15px", fontWeight: 700 }}>{label}</div>
            {action}
        </Stack>
        <div style={{ fontSize: "32px", fontWeight: 800, marginTop: "4px" }}>{value}</div>
    </Paper>
);


const InsightCard = ({ title, value, caption, delta, details = [], action }) => (
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


const BreakdownTable = ({ title, rows, nameKey = "name", valueKey = "total", money = false }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Concept</TableCell>
                        <TableCell align="right">Value</TableCell>
                        {rows?.some((row) => row.count !== undefined) && <TableCell align="right">Count</TableCell>}
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
                            <TableCell colSpan={3}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const MemberTrendChart = ({ rows }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = showTrend ? addLinearTrendLines(rows, ["current_members"]) : rows;

    return (
        <Paper style={{ padding: "16px" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                <h2 style={{ margin: 0 }}>Member Trend</h2>
                <TrendToggle checked={showTrend} onChange={setShowTrend} />
            </Stack>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 20, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value, name) => {
                                if (name === "current_members_trend") return [formatNumber(value), "Current members trend"];
                                return [formatNumber(value), name];
                            }}
                            contentStyle={chartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="not_renewed" name="Not renewed" fill="#b42318" radius={[4, 4, 0, 0]} />
                        <Line
                            type="monotone"
                            dataKey="current_members"
                            name="Current members"
                            stroke="#2f6f73"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                type="linear"
                                dataKey={trendKey("current_members")}
                                name="Current members trend"
                                stroke="#184e52"
                                {...trendStrokeStyle}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            {!rows.length && <div>No data</div>}
        </Paper>
    );
};


const RevenueItemChart = ({ rows }) => {
    const [mode, setMode] = useState("revenue");
    const valueKey = mode === "units" ? "units" : "total";
    const modeLabel = mode === "units" ? "Units sold" : "Revenue";
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
                <h2 style={{ margin: 0 }}>{mode === "units" ? "Units Sold by Item" : "Revenue by Item"}</h2>
                <TextField
                    select
                    size="small"
                    label="View"
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                    style={{ minWidth: 150 }}
                >
                    <MenuItem value="revenue">Revenue</MenuItem>
                    <MenuItem value="units">Units sold</MenuItem>
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
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const RevenueHealthTrendChart = ({ rows }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = showTrend ? addLinearTrendLines(rows, ["average_ticket"]) : rows;
    return (
        <>
            <TrendToggle checked={showTrend} onChange={setShowTrend} />
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={chartText} />
                <YAxis yAxisId="money" tick={chartText} tickFormatter={formatCompactMoney} />
                <YAxis yAxisId="ticket" orientation="right" tick={chartText} tickFormatter={formatCompactMoney} />
                <ChartTooltip
                    formatter={(value, name, item) => {
                        if (name === "sales_revenue") return [formatMoney(value), "Sales revenue"];
                        if (name === "average_ticket") return [formatMoney(value), "Average ticket"];
                        if (name === "average_ticket_trend") return [formatMoney(value), "Average ticket trend"];
                        return [formatMoney(value), name];
                    }}
                    contentStyle={expandedChartTooltipStyle}
                />
                <Legend wrapperStyle={chartLegendStyle} />
                <Bar yAxisId="money" dataKey="sales_revenue" name="Sales revenue" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                <Line
                    yAxisId="ticket"
                    type="monotone"
                    dataKey="average_ticket"
                    name="Average ticket"
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
                        name="Average ticket trend"
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


const RetentionHealthTrendChart = ({ rows }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = showTrend ? addLinearTrendLines(rows, ["renewal_rate"]) : rows;
    return (
        <>
            <TrendToggle checked={showTrend} onChange={setShowTrend} />
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartRows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={chartText} />
                <YAxis yAxisId="rate" tick={chartText} tickFormatter={(value) => `${value}%`} />
                <YAxis yAxisId="members" orientation="right" allowDecimals={false} tick={chartText} />
                <ChartTooltip
                    formatter={(value, name) => {
                        if (name === "renewal_rate") return [`${formatNumber(value)}%`, "Renewal rate"];
                        if (name === "renewal_rate_trend") return [`${formatNumber(value)}%`, "Renewal rate trend"];
                        if (name === "not_renewed_members") return [formatNumber(value), "Not renewed"];
                        if (name === "not_renewed_unassigned_studio") return [formatNumber(value), "Unassigned studio"];
                        return [formatNumber(value), name];
                    }}
                    contentStyle={expandedChartTooltipStyle}
                />
                <Legend wrapperStyle={chartLegendStyle} />
                <Bar yAxisId="members" dataKey="not_renewed_members" name="Not renewed" fill="#b42318" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="members" dataKey="not_renewed_unassigned_studio" name="Unassigned studio" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="renewal_rate"
                    name="Renewal rate"
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
                        name="Renewal rate trend"
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


const MemberMixHistoryChart = ({ rows, view }) => {
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
    const mixKeys = [...topMixNames, "Others"].map((name, index) => ({
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
            {trendKeys.length > 0 && <TrendToggle checked={showTrend} onChange={setShowTrend} />}
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
                        if (name === "renewal_rate") return [`${formatNumber(value)}%`, "Renewal rate"];
                        if (name === "renewal_rate_trend") return [`${formatNumber(value)}%`, "Renewal rate trend"];
                        if (name === "retained_members") return [formatNumber(value), "Retained"];
                        if (name === "new_members") return [formatNumber(value), "New"];
                        if (name === "reactivated_members") return [formatNumber(value), "Reactivated"];
                        if (name === "not_renewed_members") return [formatNumber(value), "Not renewed"];
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
                            name="Renewal rate"
                            stroke="#2f6f73"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                type="monotone"
                                dataKey="renewal_rate_trend"
                                name="Renewal rate trend"
                                stroke="#4b5563"
                                {...trendStrokeStyle}
                            />
                        )}
                    </>
                )}
                {view === "movement" && (
                    <>
                        <Bar dataKey="new_members" name="New" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="reactivated_members" name="Reactivated" fill="#8a5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="not_renewed_members" name="Not renewed" fill="#b42318" radius={[4, 4, 0, 0]} />
                    </>
                )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};


const CompletedVisitsRankingChart = ({ title, rows, limit = 10, wide = false }) => {
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
                            formatter={(value) => [formatNumber(value), "Completed visits"]}
                            labelFormatter={(value) => value}
                            contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey="total" name="Completed visits" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const CompletedVisitsByHourChart = ({ rows, wide = false, action }) => {
    const chartRows = (rows || []).map((row) => ({
        hour: row.hour || "N/A",
        total: Number(row.total || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap" style={{ marginBottom: "8px" }}>
                <h2 style={{ margin: 0 }}>Completed Visits by Hour</h2>
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
                        <ChartTooltip formatter={(value) => [formatNumber(value), "Completed visits"]} contentStyle={chartTooltipStyle} />
                        <Bar dataKey="total" name="Completed visits" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const WeeklyAttendanceComparisonChart = ({ rows, wide = false, action }) => (
    <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>Completed Visits vs Previous Week</h2>
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
                    <Bar dataKey="previous" name="Previous week" fill="#8a5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" name="Selected week" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
        {!rows.length && <div>No data</div>}
    </Paper>
);


const BookingQualityChart = ({ rows, wide = false, action }) => {
    const chartRows = (rows || []).map((row) => ({
        label: formatShortWeekdayDate(row.date),
        attended: Number(row.attended || 0),
        no_shows: Number(row.no_shows || 0),
        late_cancels: Number(row.late_cancels || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
                <h2 style={{ margin: 0 }}>Booking Quality by Day</h2>
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
                        <Bar dataKey="attended" name="Completed visits" stackId="bookings" fill={completedColor} />
                        <Bar dataKey="late_cancels" name="Late cancels" stackId="bookings" fill={attentionColor} />
                        <Bar dataKey="no_shows" name="No-shows" stackId="bookings" fill="#b42318" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const WeeklyAttendanceHealthTrendChart = ({ rows, view }) => {
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
            {trendKeys.length > 0 && <TrendToggle checked={showTrend} onChange={setShowTrend} />}
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart
                data={chartRows}
                margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
            >
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
                        if (name === "no_show_rate") return [`${formatNumber(value)}%`, "No-show rate"];
                        if (name === "no_show_rate_trend") return [`${formatNumber(value)}%`, "No-show rate trend"];
                        if (name === "late_cancel_rate") return [`${formatNumber(value)}%`, "Late cancel rate"];
                        if (name === "late_cancel_rate_trend") return [`${formatNumber(value)}%`, "Late cancel rate trend"];
                        if (name === "average_revenue_per_attended_visit") return [formatMoney(value), "Avg revenue / visit"];
                        if (name === "average_revenue_per_attended_visit_trend") return [formatMoney(value), "Avg revenue / visit trend"];
                        if (name === "total_bookings") return [formatNumber(value), "Total bookings"];
                        if (name === "completed_visits") return [formatNumber(value), "Completed visits"];
                        if (name === "not_completed_bookings") return [formatNumber(value), "Booked but not completed"];
                        return [formatNumber(value), name];
                    }}
                    contentStyle={expandedChartTooltipStyle}
                />
                <Legend wrapperStyle={chartLegendStyle} />
                {view === "visits" ? (
                    <>
                        <Bar dataKey="completed_visits" name="Completed visits" stackId="bookings" fill={completedColor} />
                        <Bar dataKey="not_completed_bookings" name="Booked but not completed" stackId="bookings" fill={attentionColor} radius={[4, 4, 0, 0]} />
                    </>
                ) : view === "rates" ? (
                    <>
                        <Line
                            type="monotone"
                            dataKey="late_cancel_rate"
                            name="Late cancel rate"
                            stroke="#d97706"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                type="monotone"
                                dataKey="late_cancel_rate_trend"
                                name="Late cancel rate trend"
                                stroke="#92400e"
                                {...trendStrokeStyle}
                            />
                        )}
                        <Line
                            type="monotone"
                            dataKey="no_show_rate"
                            name="No-show rate"
                            stroke="#b42318"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                type="monotone"
                                dataKey="no_show_rate_trend"
                                name="No-show rate trend"
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
                            name="Avg revenue / visit"
                            stroke="#2f6f73"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                type="monotone"
                                dataKey="average_revenue_per_attended_visit_trend"
                                name="Avg revenue / visit trend"
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


const WeeklyOccupancyHealthTrendChart = ({ rows, view }) => {
    const [showTrend, setShowTrend] = useState(false);
    const baseRows = rows.map((row) => ({
                    ...row,
                    unused_capacity: Math.max(0, Number(row.scheduled_capacity || 0) - Number(row.attendance_used || 0)),
                    occupation_label: formatPercent(row.occupation_rate),
    }));
    const chartRows = showTrend && view === "rate" ? addLinearTrendLines(baseRows, ["occupation_rate"]) : baseRows;
    return (
        <>
            {view === "rate" && <TrendToggle checked={showTrend} onChange={setShowTrend} />}
            <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer>
                    <ComposedChart
                data={chartRows}
                margin={{ top: 28, right: 24, bottom: 8, left: 8 }}
            >
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={chartText} />
                <YAxis tick={chartText} tickFormatter={view === "rate" ? (value) => `${value}%` : undefined} />
                <ChartTooltip
                    formatter={(value, name) => {
                        if (name === "occupation_rate") return [`${formatNumber(value)}%`, "Occupancy rate"];
                        if (name === "occupation_rate_trend") return [`${formatNumber(value)}%`, "Occupancy rate trend"];
                        if (name === "scheduled_capacity") return [formatNumber(value), "Scheduled capacity"];
                        if (name === "attendance_used") return [formatNumber(value), "Attendance used"];
                        if (name === "unused_capacity") return [formatNumber(value), "Unused capacity"];
                        if (name === "scheduled_classes") return [formatNumber(value), "Scheduled classes"];
                        return [formatNumber(value), name];
                    }}
                    contentStyle={expandedChartTooltipStyle}
                />
                <Legend wrapperStyle={chartLegendStyle} />
                {view === "capacity" ? (
                    <>
                        <Bar dataKey="attendance_used" name="Attendance used" stackId="capacity" fill={completedColor} />
                        <Bar dataKey="unused_capacity" name="Unused capacity" stackId="capacity" fill={unusedCapacityColor} radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="occupation_label" position="top" style={chartLabelStyle} />
                        </Bar>
                    </>
                ) : view === "classes" ? (
                    <Bar dataKey="scheduled_classes" name="Scheduled classes" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                ) : (
                    <>
                        <Line
                            type="monotone"
                            dataKey="occupation_rate"
                            name="Occupancy rate"
                            stroke="#2f6f73"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        {showTrend && (
                            <Line
                                type="monotone"
                                dataKey="occupation_rate_trend"
                                name="Occupancy rate trend"
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


const WeeklyWeekdayDrilldownChart = ({ rows, metric }) => (
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
                        if (name === "completed_visits") return [formatNumber(value), "Completed visits"];
                        if (name === "not_completed_bookings") return [formatNumber(value), "Booked but not completed"];
                        if (name === "total_bookings") return [formatNumber(value), "Total bookings"];
                        if (name === "scheduled_capacity") return [formatNumber(value), "Scheduled capacity"];
                        if (name === "occupation_rate") return [`${formatNumber(value)}%`, "Occupancy rate"];
                        if (name === "attendance_used") return [formatNumber(value), "Attendance used"];
                        if (name === "unused_capacity") return [formatNumber(value), "Unused capacity"];
                        return [formatNumber(value), name];
                    }}
                    contentStyle={expandedChartTooltipStyle}
                />
                <Legend wrapperStyle={chartLegendStyle} />
                {metric === "attendance" ? (
                    <>
                        <Bar dataKey="completed_visits" name="Completed visits" stackId="bookings" fill={completedColor} />
                        <Bar dataKey="not_completed_bookings" name="Booked but not completed" stackId="bookings" fill={attentionColor} radius={[4, 4, 0, 0]} />
                    </>
                ) : (
                    <>
                        <Bar dataKey="attendance_used" name="Attendance used" stackId="capacity" fill={completedColor} />
                        <Bar dataKey="unused_capacity" name="Unused capacity" stackId="capacity" fill={unusedCapacityColor} radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="occupation_label" position="top" style={chartLabelStyle} />
                        </Bar>
                    </>
                )}
            </ComposedChart>
        </ResponsiveContainer>
    </div>
);


const BookingQualityWeekdayHistoryChart = ({ rows }) => (
    <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
            <RechartsBarChart data={rows} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={chartText} />
                <YAxis allowDecimals={false} tick={chartText} />
                <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={expandedChartTooltipStyle} />
                <Legend wrapperStyle={chartLegendStyle} />
                <Bar dataKey="completed_visits" name="Completed visits" stackId="bookings" fill={completedColor} />
                <Bar dataKey="late_cancels" name="Late cancels" stackId="bookings" fill={attentionColor} />
                <Bar dataKey="no_shows" name="No-shows" stackId="bookings" fill="#b42318" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
        </ResponsiveContainer>
    </div>
);


const WeeklyOccupancyComparisonChart = ({ rows, wide = false, action }) => (
    <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>Occupancy vs Previous Week</h2>
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
                    <Bar dataKey="previous" name="Previous week" fill="#8a5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" name="Selected week" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
        {!rows.length && <div>No data</div>}
    </Paper>
);


const OccupancyCapacityByDayChart = ({ rows, action }) => {
    const chartRows = (rows || []).map((row) => {
        const capacity = Number(row.capacity || 0);
        const attended = Number(row.attended || 0);
        return {
            label: formatShortWeekdayDate(row.date),
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
                <h2 style={{ margin: 0 }}>Capacity Used by Day</h2>
                {action}
            </Stack>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value, name, item) => {
                                if (name === "attended") return [formatNumber(value), "Attendance used"];
                                if (name === "unused_capacity") return [formatNumber(value), "Unused capacity"];
                                return [formatNumber(value), name];
                            }}
                            labelFormatter={(label, payload) => {
                                const row = payload?.[0]?.payload;
                                return row ? `${label} - ${formatPercent(row.occupation_rate)}` : label;
                            }}
                            contentStyle={chartTooltipStyle}
                        />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="attended" name="Attendance used" stackId="capacity" fill={completedColor} />
                        <Bar dataKey="unused_capacity" name="Unused capacity" stackId="capacity" fill={unusedCapacityColor} radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const OccupancyHourMatrix = ({ data, view, weekday }) => {
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
        return <div style={{ padding: "24px 0", color: "#64748b" }}>No scheduled classes for this selection.</div>;
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
                    Day
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
                            {day.label || formatShortWeekdayDate(day.date)}
                        </div>
                        {activeHours.map((hour) => {
                            const cell = cellLookup[`${day.date}-${hour}`];
                            return (
                                <div
                                    key={`${day.date}-${hour}`}
                                    title={cell ? `${formatPercent(cell.occupation_rate)} occupancy - ${formatNumber(cell.attended)} / ${formatNumber(cell.scheduled_capacity)}` : "No scheduled class"}
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
                                                {formatNumber(cell.scheduled_classes)} class{Number(cell.scheduled_classes) === 1 ? "" : "es"}
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
                <span><strong>Cell:</strong> occupancy percentage</span>
                <span><strong>Detail:</strong> attended / scheduled capacity</span>
                <span><strong>Blank:</strong> no class scheduled</span>
            </Stack>
        </div>
    );
};


const TrialConversionFunnelChart = ({ conversion }) => {
    const trialClients = Number(conversion?.unique_trial_clients || 0);
    const chartRows = [
        { label: "Trial Clients", total: trialClients },
        { label: "Members", total: Number(conversion?.converted_members || 0) },
        { label: "Non-member Clients", total: Number(conversion?.converted_non_members || 0) },
        { label: "Not Converted", total: Number(conversion?.not_converted_clients || 0) },
    ].map((row) => ({
        ...row,
        percent: trialClients ? (row.total / trialClients) * 100 : 0,
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: "span 2" }}>
            <h2 style={{ marginTop: 0 }}>Trial Conversion Funnel</h2>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 20, right: 24, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip
                            formatter={(value, name, item) => [
                                `${formatNumber(value)} (${formatPercentOneDecimal(item?.payload?.percent || 0)})`,
                                "Clients",
                            ]}
                            contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey="total" name="Clients" fill="#2f6f73" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="total" position="top" style={chartLabelStyle} formatter={formatNumber} />
                        </Bar>
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!trialClients && <div>No data</div>}
        </Paper>
    );
};


const TrialActivityByDateChart = ({ rows }) => {
    const chartRows = (rows || []).map((row) => ({
        label: formatShortWeekdayDate(row.date),
        attended: Number(row.attended || 0),
        late_cancels: Number(row.late_cancels || 0),
        no_shows: Number(row.no_shows || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: "span 2" }}>
            <h2 style={{ marginTop: 0 }}>Trial Activity by Date</h2>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={chartTooltipStyle} />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="attended" name="Attended" stackId="trial" fill={completedColor} />
                        <Bar dataKey="late_cancels" name="Late cancels" stackId="trial" fill={attentionColor} />
                        <Bar dataKey="no_shows" name="No-shows" stackId="trial" fill="#b42318" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const TrialConversionRankingChart = ({ title, rows }) => {
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
                    <div><strong>Member conversion:</strong> {formatPercentOneDecimal(row.member_conversion_rate)}</div>
                    <div><strong>Member conversions:</strong> {formatNumber(row.converted_members)}</div>
                    <div><strong>Non-member conversions:</strong> {formatNumber(row.converted_non_members)}</div>
                    <div><strong>Not converted:</strong> {formatNumber(row.not_converted_clients)}</div>
                    <div><strong>Attended trials:</strong> {formatNumber(row.trial_clients)}</div>
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
                        <Bar dataKey="member_conversion_rate" name="Member conversion" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const ConversionTrendChart = ({ rows, view }) => {
    const [showTrend, setShowTrend] = useState(false);
    const chartRows = view === "rates" && showTrend
        ? addLinearTrendLines(rows, ["member_conversion_rate", "non_member_conversion_rate"])
        : rows;
    return (
        <>
            {view === "rates" && <TrendToggle checked={showTrend} onChange={setShowTrend} />}
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
                                <Bar dataKey="attended_trials" name="Attended trials" fill="#2f6f73" radius={[4, 4, 0, 0]} />
                            </>
                        ) : (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="member_conversion_rate"
                                    name="Member conversion rate"
                                    stroke="#2f6f73"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="non_member_conversion_rate"
                                    name="Non-member conversion rate"
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
                                            name="Member conversion trend"
                                            stroke="#184e52"
                                            {...trendStrokeStyle}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="non_member_conversion_rate_trend"
                                            name="Non-member conversion trend"
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


const TrialConversionTable = ({ rows }) => (
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


const ConversionDashboardSection = ({ conversion, comparisonConversion, periodLabel, mode, onOpenTrend }) => {
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
                    label="Attended Trials"
                    value={formatNumber(conversion?.attended_trials)}
                    action={<Button variant="outlined" size="small" onClick={() => onOpenTrend("activity")}>Trend</Button>}
                />
                <KpiCard label="Trial Clients" value={formatNumber(trialClients)} />
                <KpiCard
                    label="Member Conversion"
                    value={formatPercent(memberRate)}
                    action={(
                        <Stack spacing={0.5} alignItems="flex-end">
                            <Button variant="outlined" size="small" onClick={() => onOpenTrend("rates")}>Trend</Button>
                            {comparisonConversion && (
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                                    {comparisonDelta(memberRate, comparisonConversion.member_conversion_rate, {
                                        periodLabel,
                                        decimals: 1,
                                        suffix: " pts",
                                    }).label}
                                </span>
                            )}
                        </Stack>
                    )}
                />
                <KpiCard
                    label="Non-member Conversion"
                    value={formatPercent(nonMemberRate)}
                    action={(
                        <Stack spacing={0.5} alignItems="flex-end">
                            <Button variant="outlined" size="small" onClick={() => onOpenTrend("rates")}>Trend</Button>
                            {comparisonConversion && (
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                                    {comparisonDelta(nonMemberRate, comparisonConversion.non_member_conversion_rate, {
                                        periodLabel,
                                        decimals: 1,
                                        suffix: " pts",
                                    }).label}
                                </span>
                            )}
                        </Stack>
                    )}
                />
                <KpiCard label="Not Converted" value={formatNumber(conversion?.not_converted_clients)} />
                <KpiCard label="Avg Days to Convert" value={formatNumber(Number(conversion?.average_days_to_conversion || 0).toFixed(1))} />
            </div>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                <TrialConversionFunnelChart conversion={conversion} />
                {mode === "weekly" && <TrialActivityByDateChart rows={conversion?.by_date} />}
                <TrialConversionRankingChart title="Trial Conversion by Instructor" rows={conversion?.by_instructor} />
                <TrialConversionRankingChart title="Trial Conversion by Studio" rows={conversion?.by_studio} />
                <TrialConversionTable rows={conversion?.rows} />
            </div>
        </>
    );
};


const BarChart = ({ title, rows, labelKey = "date", valueKey = "total", money = false, limit = 31 }) => {
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


const RetentionTable = ({ title, rows }) => (
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


const retentionTableColumns = {
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


const RetentionDetailTable = ({ rows, tableKey }) => {
    const columns = retentionTableColumns[tableKey] || retentionTableColumns.not_renewed;
    return (
        <TableContainer style={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell key={column.key} align={column.align || "left"}>{column.label}</TableCell>
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
                            <TableCell colSpan={columns.length}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};


const RetentionSummaryTableCard = ({ title, rows, tableKey, onExpand }) => (
    <Paper style={{ padding: "16px" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <Button size="small" variant="outlined" onClick={onExpand}>Open Table</Button>
        </Stack>
        <RetentionDetailTable rows={(rows || []).slice(0, 5)} tableKey={tableKey} />
    </Paper>
);


const OccupationTable = ({ title, rows, labelKey = "name" }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Concept</TableCell>
                        <TableCell align="right">Capacity</TableCell>
                        <TableCell align="right">Attendance</TableCell>
                        <TableCell align="right">Occupancy</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${index}`}>
                            <TableCell>{labelKey === "date" ? formatShortWeekdayDate(row[labelKey]) : row[labelKey] || "N/A"}</TableCell>
                            <TableCell align="right">{formatNumber(row.capacity)}</TableCell>
                            <TableCell align="right">{formatNumber(row.attended)}</TableCell>
                            <TableCell align="right">{formatNumber(row.occupation_rate)}%</TableCell>
                        </TableRow>
                    ))}
                    {!rows?.length && (
                        <TableRow>
                            <TableCell colSpan={4}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const OccupancySlotTable = ({ title, rows }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Slot</TableCell>
                        <TableCell>Studio</TableCell>
                        <TableCell align="right">Capacity</TableCell>
                        <TableCell align="right">Attendance</TableCell>
                        <TableCell align="right">Occupancy</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(rows || []).map((row, index) => (
                        <TableRow key={`${title}-${row.date}-${row.start_time}-${row.studio}-${index}`}>
                            <TableCell>
                                <div>{formatShortWeekdayDate(row.date)}</div>
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
                            <TableCell colSpan={5}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const CapacityUsageCard = ({ occupation, action }) => {
    const capacity = Number(occupation?.scheduled_capacity || 0);
    const attended = Number(occupation?.matched_attended_visits || 0);
    const width = capacity ? Math.min(100, Math.max(0, (attended / capacity) * 100)) : 0;

    return (
        <Paper style={{ padding: "18px", display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ margin: 0 }}>Capacity Used</h2>
                    <div style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>Attendance compared with scheduled capacity.</div>
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
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>Attendance Used</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(attended)}</div>
                </div>
                <div>
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>Scheduled Capacity</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(capacity)}</div>
                </div>
                <div>
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>Scheduled Classes</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(occupation?.available_classes)}</div>
                </div>
                <div>
                    <div style={{ color: "#666", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>Closed / Unavailable</div>
                    <div style={{ fontSize: "26px", fontWeight: 800 }}>{formatNumber(occupation?.closed_or_unavailable_classes)}</div>
                </div>
            </div>
        </Paper>
    );
};


const InstructorQualityTable = ({ rows }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Instructor Quality</h2>
        <TableContainer style={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Instructor</TableCell>
                        <TableCell align="right">Reservations</TableCell>
                        <TableCell align="right">Completed</TableCell>
                        <TableCell align="right">No-show</TableCell>
                        <TableCell align="right">Late Cancel</TableCell>
                        <TableCell align="right">Revenue</TableCell>
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
                            <TableCell colSpan={6}>No data</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);


const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatMoney = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatCompactMoney = (value) => {
    const numberValue = Number(value || 0);
    if (Math.abs(numberValue) >= 1000000) return `${(numberValue / 1000000).toFixed(1)}M`;
    if (Math.abs(numberValue) >= 1000) return `${(numberValue / 1000).toFixed(0)}K`;
    return formatMoney(numberValue);
};
const truncateLabel = (value, maxLength = 24) => {
    const text = String(value || "N/A");
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};
const formatPercent = (value) => `${formatNumber(value)}%`;
const formatPercentOneDecimal = (value) => `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})}%`;
const numericValue = (value) => Number(value || 0);
const comparisonDelta = (current, previous, options = {}) => {
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
        label: `${labelValue} vs previous ${options.periodLabel || "period"}`,
    };
};
const formatActivityStatus = (value) => ({
    inactive: "Inactive",
    attending_unpaid: "Attending Unpaid",
    attending_paid: "Attending Paid",
}[value] || "N/A");


const monthOptions = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];


const yearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 3 + index);
};


const currentMonthValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};


const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];


const lastCompletedMonthValue = () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = previousMonth.getFullYear();
    const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};


const monthParts = (monthValue) => {
    const [year, month] = monthValue.split("-");
    return { year, month };
};


const buildMonthValue = (year, month) => `${year}-${month}`;


const parseDateValue = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};


const formatDateValue = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


const addMonths = (monthValue, amount) => {
    const [year, month] = monthValue.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + amount, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
};


const addDays = (dateValue, amount) => {
    const nextDate = parseDateValue(dateValue);
    nextDate.setDate(nextDate.getDate() + amount);
    return formatDateValue(nextDate);
};


const monthRange = (monthValue) => {
    const [year, month] = monthValue.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
        date_from: `${monthValue}-01`,
        date_to: `${monthValue}-${String(lastDay).padStart(2, "0")}`,
    };
};


const weekRange = (value = new Date()) => {
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


const previousWeekRange = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return weekRange(today);
};


const weekRangeFromDate = (value) => {
    if (!value) return weekRange();
    return weekRange(parseDateValue(value));
};


const selectedDateRange = (dashboardMode, periodModes, filters) => {
    const periodMode = periodModes[dashboardMode];
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


const weekdayIndex = (dateValue) => {
    const day = parseDateValue(dateValue).getDay();
    return day === 0 ? 6 : day - 1;
};


const rowsByWeekday = (rows, dateKey = "date") => {
    const lookup = {};
    (rows || []).forEach((row) => {
        if (!row[dateKey]) return;
        lookup[weekdayIndex(row[dateKey])] = row;
    });
    return lookup;
};


const weeklyComparisonRows = (dateRange, currentRows, previousRows, valueKey = "total") => {
    if (!dateRange?.date_from) return [];
    const currentLookup = rowsByWeekday(currentRows);
    const previousLookup = rowsByWeekday(previousRows);
    return Array.from({ length: 7 }, (_, index) => {
        const dateValue = addDays(dateRange.date_from, index);
        return {
            label: formatShortWeekdayDate(dateValue),
            current: Number(currentLookup[index]?.[valueKey] || 0),
            previous: Number(previousLookup[index]?.[valueKey] || 0),
        };
    });
};


const formatDisplayDate = (value) => {
    if (!value) return "N/A";
    return parseDateValue(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};


const formatShortWeekdayDate = (value) => {
    if (!value) return "N/A";
    const dateValue = parseDateValue(value);
    const weekday = dateValue.toLocaleDateString(undefined, { weekday: "short" });
    const day = String(dateValue.getDate()).padStart(2, "0");
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    return `${weekday} ${day}-${month}`;
};


const formatPeriodTitle = (dashboardMode, dateRange) => {
    if (!dateRange?.date_from || !dateRange?.date_to) return "N/A";
    const start = parseDateValue(dateRange.date_from);
    const end = parseDateValue(dateRange.date_to);
    if (dashboardMode === "monthly") {
        return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
};


const formatMonthLabel = (monthValue) => {
    if (!monthValue) return "N/A";
    return parseDateValue(monthValue).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};


const dashboardModes = {
    monthly: {
        title: "Monthly Performance",
        defaultTab: "monthly_overview",
    },
    weekly: {
        title: "Weekly Operations",
        defaultTab: "weekly_overview",
    },
};


const dashboardTabs = {
    monthly: [
        { label: "Summary", value: "monthly_overview" },
        { label: "Revenue", value: "revenue" },
        { label: "Retention", value: "retention" },
        { label: "Conversion", value: "conversion" },
    ],
    weekly: [
        { label: "Summary", value: "weekly_overview" },
        { label: "Attendance", value: "attendance" },
        { label: "Occupancy", value: "occupancy" },
        { label: "Conversion", value: "conversion" },
    ],
};


const dashboardStorageKey = "beness.dashboard.filters";


const dashboardDefaultState = () => {
    const defaultMonth = lastCompletedMonthValue();
    const defaultWeek = weekRange();
    return {
        dashboardMode: "monthly",
        activeTab: "monthly_overview",
        periodModes: {
            monthly: "last_completed_month",
            weekly: "current_week",
        },
        filters: {
            site: "",
            studio: "",
            month: defaultMonth,
            week_date: defaultWeek.date_from,
            date_from: defaultWeek.date_from,
            date_to: defaultWeek.date_to,
        },
    };
};


const firstQueryValue = (value) => Array.isArray(value) ? value[0] : value;


const hasDashboardQuery = (query) => [
    "mode",
    "tab",
    "site",
    "studio",
    "monthly_period",
    "weekly_period",
    "month",
    "week_date",
    "date_from",
    "date_to",
].some((key) => firstQueryValue(query?.[key]));


const dashboardStateFromQuery = (query, fallbackState) => {
    const mode = firstQueryValue(query.mode);
    const nextMode = dashboardModes[mode] ? mode : fallbackState.dashboardMode;
    const tab = firstQueryValue(query.tab);
    const validTabs = dashboardTabs[nextMode].map((item) => item.value);
    const monthlyPeriod = firstQueryValue(query.monthly_period);
    const weeklyPeriod = firstQueryValue(query.weekly_period);
    const nextPeriodModes = {
        ...fallbackState.periodModes,
        ...(monthlyPeriod ? { monthly: monthlyPeriod } : {}),
        ...(weeklyPeriod ? { weekly: weeklyPeriod } : {}),
    };
    return {
        dashboardMode: nextMode,
        activeTab: validTabs.includes(tab) ? tab : dashboardModes[nextMode].defaultTab,
        periodModes: nextPeriodModes,
        filters: {
            ...fallbackState.filters,
            site: firstQueryValue(query.site) || "",
            studio: firstQueryValue(query.studio) || "",
            month: firstQueryValue(query.month) || fallbackState.filters.month,
            week_date: firstQueryValue(query.week_date) || fallbackState.filters.week_date,
            date_from: firstQueryValue(query.date_from) || fallbackState.filters.date_from,
            date_to: firstQueryValue(query.date_to) || fallbackState.filters.date_to,
        },
    };
};


const dashboardQueryFromState = (dashboardMode, activeTab, periodModes, filters) => {
    const query = {
        mode: dashboardMode,
        tab: activeTab,
        monthly_period: periodModes.monthly,
        weekly_period: periodModes.weekly,
        month: filters.month,
        week_date: filters.week_date,
        date_from: filters.date_from,
        date_to: filters.date_to,
    };
    if (filters.site) query.site = filters.site;
    if (filters.studio) query.studio = filters.studio;
    return query;
};


const sameQuery = (currentQuery, nextQuery) => {
    const current = Object.fromEntries(
        Object.entries(currentQuery || {}).map(([key, value]) => [key, firstQueryValue(value)]),
    );
    const currentKeys = Object.keys(current).filter((key) => current[key] !== undefined && current[key] !== "");
    const nextKeys = Object.keys(nextQuery).filter((key) => nextQuery[key] !== undefined && nextQuery[key] !== "");
    if (currentKeys.length !== nextKeys.length) return false;
    return nextKeys.every((key) => String(current[key] || "") === String(nextQuery[key] || ""));
};


export default function Dashboard() {
    const token = useFetchToken();
    const router = useRouter();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const initialDashboardState = useMemo(() => dashboardDefaultState(), []);

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [periodModes, setPeriodModes] = useState(initialDashboardState.periodModes);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [filtersHydrated, setFiltersHydrated] = useState(false);
    const [periodNavigationVersion, setPeriodNavigationVersion] = useState(0);
    const [filters, setFilters] = useState(initialDashboardState.filters);
    const [summary, setSummary] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [retention, setRetention] = useState(null);
    const [occupation, setOccupation] = useState(null);
    const [conversion, setConversion] = useState(null);
    const [comparisonSummary, setComparisonSummary] = useState(null);
    const [comparisonRetention, setComparisonRetention] = useState(null);
    const [comparisonAttendance, setComparisonAttendance] = useState(null);
    const [comparisonOccupation, setComparisonOccupation] = useState(null);
    const [comparisonConversion, setComparisonConversion] = useState(null);
    const [retentionTrend, setRetentionTrend] = useState(null);
    const [dashboardMode, setDashboardMode] = useState(initialDashboardState.dashboardMode);
    const [activeTab, setActiveTab] = useState(initialDashboardState.activeTab);
    const [expandedInsight, setExpandedInsight] = useState(null);
    const [memberMixTrendView, setMemberMixTrendView] = useState("members");
    const [retentionTables, setRetentionTables] = useState(null);
    const [retentionTablesLoading, setRetentionTablesLoading] = useState(false);
    const [activeRetentionTable, setActiveRetentionTable] = useState("not_renewed");
    const [weeklyTrends, setWeeklyTrends] = useState(null);
    const [weeklyTrendsLoading, setWeeklyTrendsLoading] = useState(false);
    const [weeklyAttendanceTrendView, setWeeklyAttendanceTrendView] = useState("visits");
    const [weeklyOccupancyTrendView, setWeeklyOccupancyTrendView] = useState("capacity");
    const [conversionTrendView, setConversionTrendView] = useState("activity");
    const [occupancyHourMatrix, setOccupancyHourMatrix] = useState(null);
    const [occupancyHourMatrixLoading, setOccupancyHourMatrixLoading] = useState(false);
    const [occupancyHourMatrixView, setOccupancyHourMatrixView] = useState("current_week");
    const [weeklyDrilldownWeekday, setWeeklyDrilldownWeekday] = useState("Monday");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchAllPages = async (endpoint) => {
        let url = `${backendUrl}/api/data/${endpoint}/`;
        let rows = [];
        while (url) {
            const response = await axios.get(url, authHeaders);
            const pageRows = response.data.results || response.data;
            rows = [...rows, ...pageRows];
            url = normalizeApiNextUrl(response.data.next, backendUrl);
        }
        return rows;
    };

    const fetchLookups = async () => {
        if (!token) return;
        const [nextSites, nextStudios] = await Promise.all([
            fetchAllPages("sites"),
            fetchAllPages("studios"),
        ]);
        setSites(nextSites);
        setStudios(nextStudios);
    };

    const fetchDashboard = async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const dateFilters = selectedDateRange(dashboardMode, periodModes, filters);
            const queryStringFor = (range) => {
                const params = new URLSearchParams();
                const requestFilters = {
                    site: filters.site,
                    studio: filters.studio,
                    ...range,
                };
                Object.entries(requestFilters).forEach(([key, value]) => {
                    if (value) params.set(key, value);
                });
                return params.toString();
            };
            const queryString = queryStringFor(dateFilters);

            if (dashboardMode === "monthly") {
                const [dashboardResponse, trendResponse] = await Promise.all([
                    axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/?${queryString}`, authHeaders),
                    axios.get(`${backendUrl}/api/data/analytics/dashboard/monthly/trends/?${queryString}`, authHeaders),
                ]);
                const dashboardData = dashboardResponse.data;
                setSummary(dashboardData.current.summary);
                setRevenue(dashboardData.current.revenue);
                setRetention(dashboardData.current.retention);
                setConversion(dashboardData.current.conversion);
                setComparisonSummary(dashboardData.comparison.summary);
                setComparisonRetention(dashboardData.comparison.retention);
                setComparisonConversion(dashboardData.comparison.conversion);
                setRetentionTrend(trendResponse.data);
                setComparisonAttendance(null);
                setComparisonOccupation(null);
                setAttendance(null);
                setOccupation(null);
                setRetentionTables(null);
                setWeeklyTrends(null);
                setOccupancyHourMatrix(null);
            } else {
                const dashboardResponse = await axios.get(`${backendUrl}/api/data/analytics/dashboard/weekly/?${queryString}`, authHeaders);
                const dashboardData = dashboardResponse.data;
                setSummary(dashboardData.current.summary);
                setAttendance(dashboardData.current.attendance);
                setOccupation(dashboardData.current.occupation);
                setConversion(dashboardData.current.conversion);
                setComparisonSummary(dashboardData.comparison.summary);
                setComparisonAttendance(dashboardData.comparison.attendance);
                setComparisonOccupation(dashboardData.comparison.occupation);
                setComparisonConversion(dashboardData.comparison.conversion);
                setComparisonRetention(null);
                setRetentionTrend(null);
                setRetentionTables(null);
                setWeeklyTrends(null);
                setOccupancyHourMatrix(null);
                setRevenue(null);
                setRetention(null);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!router.isReady) return;
        let nextState = initialDashboardState;
        if (hasDashboardQuery(router.query)) {
            nextState = dashboardStateFromQuery(router.query, initialDashboardState);
        } else if (typeof window !== "undefined") {
            try {
                const storedState = JSON.parse(window.localStorage.getItem(dashboardStorageKey) || "null");
                if (storedState) {
                    nextState = {
                        dashboardMode: storedState.dashboardMode || initialDashboardState.dashboardMode,
                        activeTab: storedState.activeTab || initialDashboardState.activeTab,
                        periodModes: { ...initialDashboardState.periodModes, ...(storedState.periodModes || {}) },
                        filters: { ...initialDashboardState.filters, ...(storedState.filters || {}) },
                    };
                    const validTabs = dashboardTabs[nextState.dashboardMode]?.map((item) => item.value) || [];
                    if (!validTabs.includes(nextState.activeTab)) {
                        nextState.activeTab = dashboardModes[nextState.dashboardMode]?.defaultTab || initialDashboardState.activeTab;
                    }
                }
            } catch {
                nextState = initialDashboardState;
            }
        }
        setDashboardMode(nextState.dashboardMode);
        setActiveTab(nextState.activeTab);
        setPeriodModes(nextState.periodModes);
        setFilters(nextState.filters);
        setFiltersHydrated(true);
    }, [router.isReady]);

    useEffect(() => {
        if (!filtersHydrated || !router.isReady) return;
        const state = { dashboardMode, activeTab, periodModes, filters };
        if (typeof window !== "undefined") {
            window.localStorage.setItem(dashboardStorageKey, JSON.stringify(state));
        }
        const nextQuery = dashboardQueryFromState(dashboardMode, activeTab, periodModes, filters);
        if (!sameQuery(router.query, nextQuery)) {
            router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
        }
    }, [filtersHydrated, router.isReady, dashboardMode, activeTab, periodModes, filters]);

    useEffect(() => {
        if (!filtersHydrated) return;
        fetchDashboard();
    }, [token, dashboardMode, periodNavigationVersion, filtersHydrated]);

    const totals = summary?.totals || {};
    const comparisonTotals = comparisonSummary?.totals || {};
    const periodLabel = dashboardMode === "monthly" ? "month" : "week";
    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const activePeriodMode = periodModes[dashboardMode];
    const activeDateRange = selectedDateRange(dashboardMode, periodModes, filters);
    const activePeriodTitle = formatPeriodTitle(dashboardMode, activeDateRange);
    const retentionFollowUpHref = {
        pathname: "/retention",
        query: {
            period: "range",
            date_from: activeDateRange.date_from,
            date_to: activeDateRange.date_to,
            status: "not_renewed",
            ...(filters.site ? { site: filters.site } : {}),
            ...(filters.studio ? { studio: filters.studio } : {}),
        },
    };
    const selectedMonthParts = monthParts(filters.month);
    const activeDashboardTabs = dashboardTabs[dashboardMode];
    const occupancySlots = occupation?.by_slot || [];
    const lowOccupancySlots = [...occupancySlots]
        .filter((row) => Number(row.capacity || 0) > 0)
        .sort((a, b) => Number(a.occupation_rate || 0) - Number(b.occupation_rate || 0))
        .slice(0, 10);
    const highOccupancySlots = [...occupancySlots]
        .filter((row) => Number(row.capacity || 0) > 0)
        .sort((a, b) => Number(b.occupation_rate || 0) - Number(a.occupation_rate || 0))
        .slice(0, 10);
    const retentionTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month),
        current_members: row.current_members || 0,
        not_renewed: row.not_renewed_members || 0,
    }));
    const revenueTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month),
        sales_revenue: row.sales_revenue || 0,
        average_ticket: row.average_ticket || 0,
    }));
    const retentionHealthTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month),
        renewal_rate: row.renewal_rate || 0,
        not_renewed_members: row.not_renewed_members || 0,
        not_renewed_unassigned_studio: row.not_renewed_unassigned_studio || 0,
    }));
    const memberMixTrendRows = (retentionTrend?.months || []).map((row) => ({
        label: formatMonthLabel(row.month),
        current_members: row.current_members || 0,
        current_member_mix: row.current_member_mix || [],
        retained_members: row.retained_members || 0,
        new_members: row.new_members || 0,
        reactivated_members: row.reactivated_members || 0,
        not_renewed_members: row.not_renewed_members || 0,
        renewal_rate: row.renewal_rate || 0,
    }));
    const weeklyTrendRows = (weeklyTrends?.weeks || []).map((row) => ({
        label: formatShortWeekdayDate(row.week_start),
        total_bookings: row.total_bookings || 0,
        completed_visits: row.completed_visits || 0,
        no_show_rate: row.no_show_rate || 0,
        late_cancel_rate: row.late_cancel_rate || 0,
        average_revenue_per_attended_visit: row.average_revenue_per_attended_visit || 0,
        occupation_rate: row.occupation_rate || 0,
        scheduled_capacity: row.scheduled_capacity || 0,
        attendance_used: row.attendance_used || 0,
        unused_capacity: Math.max(0, Number(row.scheduled_capacity || 0) - Number(row.attendance_used || 0)),
        scheduled_classes: row.scheduled_classes || 0,
        trial_bookings: row.trial_bookings || 0,
        attended_trials: row.attended_trials || 0,
        member_conversion_rate: row.member_conversion_rate || 0,
        non_member_conversion_rate: row.non_member_conversion_rate || 0,
    }));
    const conversionTrendRows = dashboardMode === "monthly"
        ? (retentionTrend?.months || []).map((row) => ({
            label: formatMonthLabel(row.month),
            trial_bookings: row.trial_bookings || 0,
            attended_trials: row.attended_trials || 0,
            member_conversion_rate: row.member_conversion_rate || 0,
            non_member_conversion_rate: row.non_member_conversion_rate || 0,
        }))
        : weeklyTrendRows;
    const weeklyWeekdayDrilldownRows = (weeklyTrends?.weekday_rows || [])
        .filter((row) => row.weekday === weeklyDrilldownWeekday)
        .map((row) => ({
            label: formatShortWeekdayDate(row.date),
            total_bookings: row.total_bookings || 0,
            completed_visits: row.completed_visits || 0,
            no_shows: row.no_shows || 0,
            late_cancels: row.late_cancels || 0,
            scheduled_capacity: row.scheduled_capacity || 0,
            attendance_used: row.attendance_used || 0,
            unused_capacity: Math.max(0, Number(row.scheduled_capacity || 0) - Number(row.attendance_used || 0)),
            occupation_rate: row.occupation_rate || 0,
        }));
    const weeklyAttendanceComparisonRows = weeklyComparisonRows(
        activeDateRange,
        attendance?.attended_by_date,
        comparisonAttendance?.attended_by_date,
        "total",
    );
    const weeklyOccupancyComparisonRows = weeklyComparisonRows(
        activeDateRange,
        occupation?.by_day,
        comparisonOccupation?.by_day,
        "occupation_rate",
    );

    const handleDashboardModeChange = (_, value) => {
        if (!value) return;
        setDashboardMode(value);
        setActiveTab(dashboardModes[value].defaultTab);
    };

    const handlePeriodModeChange = (event) => {
        setPeriodModes({
            ...periodModes,
            [dashboardMode]: event.target.value,
        });
    };

    const handleSiteChange = (event) => {
        setFilters({ ...filters, site: event.target.value, studio: "" });
        setPeriodNavigationVersion((current) => current + 1);
    };

    const handleStudioChange = (event) => {
        setFilters({ ...filters, studio: event.target.value });
        setPeriodNavigationVersion((current) => current + 1);
    };

    const openRetentionTable = async (tableKey) => {
        setActiveRetentionTable(tableKey);
        setExpandedInsight("retention_tables");
        if (retentionTables) return;
        setRetentionTablesLoading(true);
        try {
            const dateFilters = selectedDateRange("monthly", periodModes, filters);
            const params = new URLSearchParams({
                date_from: dateFilters.date_from,
                date_to: dateFilters.date_to,
                limit: "500",
            });
            if (filters.site) params.set("site", filters.site);
            if (filters.studio) params.set("studio", filters.studio);
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/dashboard/monthly/retention-tables/?${params.toString()}`,
                authHeaders,
            );
            setRetentionTables(response.data.tables);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading retention table.");
        } finally {
            setRetentionTablesLoading(false);
        }
    };

    const openWeeklyTrend = async (insightKey) => {
        setExpandedInsight(insightKey);
        if (weeklyTrends) return;
        setWeeklyTrendsLoading(true);
        try {
            const dateFilters = selectedDateRange("weekly", periodModes, filters);
            const params = new URLSearchParams({
                date_from: dateFilters.date_from,
                date_to: dateFilters.date_to,
            });
            if (filters.site) params.set("site", filters.site);
            if (filters.studio) params.set("studio", filters.studio);
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/dashboard/weekly/trends/?${params.toString()}`,
                authHeaders,
            );
            setWeeklyTrends(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading weekly trend.");
        } finally {
            setWeeklyTrendsLoading(false);
        }
    };

    const openOccupancyHourMatrix = async () => {
        setExpandedInsight("occupancy_hour_matrix");
        if (occupancyHourMatrix) return;
        setOccupancyHourMatrixLoading(true);
        try {
            const dateFilters = selectedDateRange("weekly", periodModes, filters);
            const params = new URLSearchParams({
                date_from: dateFilters.date_from,
                date_to: dateFilters.date_to,
                weeks: "6",
            });
            if (filters.site) params.set("site", filters.site);
            if (filters.studio) params.set("studio", filters.studio);
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/dashboard/weekly/occupancy-hour-matrix/?${params.toString()}`,
                authHeaders,
            );
            setOccupancyHourMatrix(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading occupancy matrix.");
        } finally {
            setOccupancyHourMatrixLoading(false);
        }
    };

    const openWeeklyAttendanceTrend = (view) => {
        setWeeklyAttendanceTrendView(view);
        openWeeklyTrend("weekly_attendance_health");
    };

    const openConversionTrend = (view) => {
        setConversionTrendView(view);
        if (dashboardMode === "weekly") {
            openWeeklyTrend("conversion_trend");
            return;
        }
        setExpandedInsight("conversion_trend");
    };

    const navigatePeriod = (direction) => {
        if (dashboardMode === "monthly") {
            const activeMonth = activeDateRange.date_from.slice(0, 7);
            const nextMonth = addMonths(activeMonth, direction);
            setPeriodModes({ ...periodModes, monthly: "specific_month" });
            setFilters({ ...filters, month: nextMonth });
        } else {
            const nextWeekDate = addDays(activeDateRange.date_from, direction * 7);
            const nextWeekRange = weekRangeFromDate(nextWeekDate);
            setPeriodModes({ ...periodModes, weekly: "specific_week" });
            setFilters({
                ...filters,
                week_date: nextWeekRange.date_from,
                date_from: nextWeekRange.date_from,
                date_to: nextWeekRange.date_to,
            });
        }
        setPeriodNavigationVersion((current) => current + 1);
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Dashboard</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Dashboard</h1>
                </div>

                <div style={{ width: "90%", display: "grid", gap: "16px" }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper style={{ padding: "0 12px" }}>
                        <Tabs
                            value={dashboardMode}
                            onChange={handleDashboardModeChange}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab label="Monthly Performance" value="monthly" />
                            <Tab label="Weekly Operations" value="weekly" />
                        </Tabs>
                    </Paper>

                    <Paper style={{ padding: "12px", display: "grid", gap: "12px" }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                            <TextField
                                select
                                label="Site"
                                size="small"
                                value={filters.site}
                                onChange={handleSiteChange}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">All Sites</MenuItem>
                                {sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label="Studio"
                                size="small"
                                value={filters.studio}
                                onChange={handleStudioChange}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">All Studios</MenuItem>
                                {visibleStudios.map((studio) => (
                                    <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>
                                ))}
                            </TextField>
                            <Button variant="outlined" onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}>
                                {advancedFiltersOpen ? "Hide Advanced" : "Advanced"}
                            </Button>
                        </Stack>
                        {advancedFiltersOpen && (
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <TextField
                                    select
                                    label="Period"
                                    value={activePeriodMode}
                                    onChange={handlePeriodModeChange}
                                >
                                    {dashboardMode === "monthly" ? (
                                        [
                                            <MenuItem key="last_completed_month" value="last_completed_month">Last Completed Month</MenuItem>,
                                            <MenuItem key="current_month" value="current_month">Current Month</MenuItem>,
                                            <MenuItem key="specific_month" value="specific_month">Specific Month</MenuItem>,
                                        ]
                                    ) : (
                                        [
                                            <MenuItem key="current_week" value="current_week">Current Week</MenuItem>,
                                            <MenuItem key="previous_week" value="previous_week">Previous Week</MenuItem>,
                                            <MenuItem key="specific_week" value="specific_week">Specific Week</MenuItem>,
                                            <MenuItem key="range" value="range">Custom Range</MenuItem>,
                                        ]
                                    )}
                                </TextField>
                                {dashboardMode === "monthly" && activePeriodMode === "specific_month" && (
                                    <>
                                        <TextField
                                            select
                                            label="Month"
                                            value={selectedMonthParts.month}
                                            onChange={(event) => setFilters({
                                                ...filters,
                                                month: buildMonthValue(selectedMonthParts.year, event.target.value),
                                            })}
                                        >
                                            {monthOptions.map((month) => (
                                                <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            select
                                            label="Year"
                                            value={Number(selectedMonthParts.year)}
                                            onChange={(event) => setFilters({
                                                ...filters,
                                                month: buildMonthValue(event.target.value, selectedMonthParts.month),
                                            })}
                                        >
                                            {yearOptions().map((year) => (
                                                <MenuItem key={year} value={year}>{year}</MenuItem>
                                            ))}
                                        </TextField>
                                    </>
                                )}
                                {dashboardMode === "weekly" && activePeriodMode === "specific_week" && (
                                    <TextField
                                        label="Week Of"
                                        type="date"
                                        value={filters.week_date}
                                        InputLabelProps={{ shrink: true }}
                                        onChange={(event) => setFilters({ ...filters, week_date: event.target.value })}
                                    />
                                )}
                                {dashboardMode === "weekly" && activePeriodMode === "range" && (
                                    <>
                                        <TextField
                                            label="Date From"
                                            type="date"
                                            value={filters.date_from}
                                            InputLabelProps={{ shrink: true }}
                                            onChange={(event) => setFilters({ ...filters, date_from: event.target.value })}
                                        />
                                        <TextField
                                            label="Date To"
                                            type="date"
                                            value={filters.date_to}
                                            InputLabelProps={{ shrink: true }}
                                            onChange={(event) => setFilters({ ...filters, date_to: event.target.value })}
                                        />
                                    </>
                                )}
                                <Button variant="contained" onClick={fetchDashboard} disabled={loading}>
                                    {loading ? "Loading..." : "Apply"}
                                </Button>
                            </div>
                        )}
                        {loading && <LinearProgress />}
                    </Paper>

                    <Paper variant="outlined" style={{ padding: "10px 14px", background: "#fafafa" }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                            <Tooltip title={`Previous ${dashboardMode === "monthly" ? "month" : "week"}`}>
                                <span>
                                    <IconButton onClick={() => navigatePeriod(-1)} disabled={loading} size="small">
                                        <ChevronLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <div style={{ minWidth: "220px", textAlign: "center" }}>
                                <div style={{ fontSize: "18px", fontWeight: 700 }}>{activePeriodTitle}</div>
                                <div style={{ color: "#666", fontSize: "13px" }}>
                                    {formatDisplayDate(activeDateRange.date_from)} - {formatDisplayDate(activeDateRange.date_to)}
                                </div>
                            </div>
                            <Tooltip title={`Next ${dashboardMode === "monthly" ? "month" : "week"}`}>
                                <span>
                                    <IconButton onClick={() => navigatePeriod(1)} disabled={loading} size="small">
                                        <ChevronRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Paper>

                    <Paper style={{ padding: "0 12px" }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, value) => setActiveTab(value)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {activeDashboardTabs.map((tab) => (
                                <Tab key={tab.value} label={tab.label} value={tab.value} />
                            ))}
                        </Tabs>
                    </Paper>

                    {activeTab === "monthly_overview" && (
                        <>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                                <InsightCard
                                    title="Revenue Health"
                                    value={formatMoney(totals.sales_revenue)}
                                    delta={comparisonDelta(totals.sales_revenue, comparisonTotals.sales_revenue, {
                                        periodLabel,
                                        decimals: 2,
                                        money: true,
                                    })}
                                    caption="Sales revenue for the selected month."
                                    details={[
                                        { label: "Visit revenue", value: formatMoney(totals.visit_revenue) },
                                        { label: "Average ticket", value: formatMoney(totals.average_ticket) },
                                        { label: "Sales by studio", value: formatNumber(revenue?.by_studio?.length) },
                                    ]}
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => setExpandedInsight("revenue_health")}>
                                            View Trend
                                        </Button>
                                    )}
                                />
                                <InsightCard
                                    title="Retention Health"
                                    value={formatPercent(retention?.renewal_rate)}
                                    delta={comparisonDelta(retention?.renewal_rate, comparisonRetention?.renewal_rate, {
                                        periodLabel,
                                        decimals: 2,
                                        suffix: " pts",
                                    })}
                                    caption="Renewal rate from monthly membership snapshots."
                                    details={[
                                        { label: "Churn rate", value: formatPercent(retention?.churn_rate) },
                                        { label: "Retained members", value: formatNumber(retention?.retained_members) },
                                        { label: "Current members", value: formatNumber(retention?.current_month_members) },
                                        { label: "Unassigned not renewed", value: formatNumber(retention?.not_renewed_unassigned_studio) },
                                    ]}
                                    action={(
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            <Button variant="outlined" size="small" onClick={() => setExpandedInsight("retention_health")}>
                                                View Trend
                                            </Button>
                                            <Link href="/retention">
                                                <Button variant="outlined" size="small">Open Follow-up</Button>
                                            </Link>
                                        </Stack>
                                    )}
                                />
                                <InsightCard
                                    title="Follow-up Focus"
                                    value={formatNumber(retention?.not_renewed_members ?? retention?.not_renewed_services)}
                                    delta={comparisonDelta(
                                        retention?.not_renewed_members ?? retention?.not_renewed_services,
                                        comparisonRetention?.not_renewed_members ?? comparisonRetention?.not_renewed_services,
                                        { periodLabel, invertTone: true },
                                    )}
                                    caption="Members who did not renew in the selected month."
                                    details={[
                                        { label: "Value at risk", value: formatMoney(retention?.not_renewed_value) },
                                        { label: "Attending unpaid", value: formatNumber(retention?.not_renewed_attending_unpaid) },
                                        { label: "Attending paid", value: formatNumber(retention?.not_renewed_attending_paid) },
                                    ]}
                                />
                            </div>
                        </>
                    )}

                    {activeTab === "weekly_overview" && (
                        <>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                                <InsightCard
                                    title="Attendance Health"
                                    value={formatNumber(totals.attended_visits)}
                                    delta={comparisonDelta(totals.attended_visits, comparisonTotals.attended_visits, { periodLabel })}
                                    caption="Completed visits for the selected week."
                                    details={[
                                        { label: "Total bookings", value: formatNumber(totals.attendance_visits) },
                                        { label: "No-show rate", value: formatPercent(totals.no_show_rate) },
                                        { label: "Late cancel rate", value: formatPercent(totals.late_cancel_rate) },
                                    ]}
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_attendance_health")}>
                                            View Trend
                                        </Button>
                                    )}
                                />
                                <InsightCard
                                    title="Occupancy Health"
                                    value={formatPercent(occupation?.occupation_rate)}
                                    delta={comparisonDelta(occupation?.occupation_rate, comparisonOccupation?.occupation_rate, {
                                        periodLabel,
                                        decimals: 2,
                                        suffix: " pts",
                                    })}
                                    caption="How much scheduled capacity was used."
                                    details={[
                                        { label: "Attendance used", value: formatNumber(occupation?.matched_attended_visits) },
                                        { label: "Scheduled capacity", value: formatNumber(occupation?.scheduled_capacity) },
                                        { label: "Scheduled classes", value: formatNumber(occupation?.available_classes) },
                                    ]}
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_occupancy_health")}>
                                            View Trend
                                        </Button>
                                    )}
                                />
                                <InsightCard
                                    title="Studio Activity"
                                    value={formatNumber(totals.active_clients)}
                                    delta={comparisonDelta(totals.active_clients, comparisonTotals.active_clients, { periodLabel })}
                                    caption="Clients with activity during the selected week."
                                    details={[
                                        { label: "Scheduled classes", value: formatNumber(occupation?.available_classes) },
                                        { label: "Closed / unavailable", value: formatNumber(occupation?.closed_or_unavailable_classes) },
                                        { label: "Tracked time slots", value: formatNumber(occupancySlots.length) },
                                    ]}
                                />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                                <WeeklyAttendanceComparisonChart
                                    rows={weeklyAttendanceComparisonRows}
                                    wide
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_attendance_weekday")}>
                                            Weekday Detail
                                        </Button>
                                    )}
                                />
                                <WeeklyOccupancyComparisonChart
                                    rows={weeklyOccupancyComparisonRows}
                                    wide
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_occupancy_weekday")}>
                                            Weekday Detail
                                        </Button>
                                    )}
                                />
                                <OccupationTable title="Occupancy by Studio" rows={occupation?.by_studio} />
                            </div>
                        </>
                    )}

                    {activeTab === "revenue" && (
                        <>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <KpiCard label="Sales Revenue" value={formatMoney(totals.sales_revenue)} />
                                <KpiCard label="Visit Revenue" value={formatMoney(totals.visit_revenue)} />
                                <KpiCard label="Average Ticket" value={formatMoney(totals.average_ticket)} />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                                <RevenueItemChart rows={revenue?.by_item} />
                            </div>
                        </>
                    )}

                    {activeTab === "attendance" && (
                        <>
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <KpiCard
                                    label="Total Bookings"
                                    value={formatNumber(totals.attendance_visits)}
                                    action={<Button variant="outlined" size="small" onClick={() => openWeeklyAttendanceTrend("visits")}>Trend</Button>}
                                />
                                <KpiCard
                                    label="Completed Visits"
                                    value={formatNumber(totals.attended_visits)}
                                    action={<Button variant="outlined" size="small" onClick={() => openWeeklyAttendanceTrend("visits")}>Trend</Button>}
                                />
                                <KpiCard
                                    label="Avg Revenue / Visit"
                                    value={formatMoney(totals.average_revenue_per_attended_visit)}
                                    action={<Button variant="outlined" size="small" onClick={() => openWeeklyAttendanceTrend("revenue")}>Trend</Button>}
                                />
                                <KpiCard
                                    label="No-show Rate"
                                    value={`${formatNumber(totals.no_show_rate)}%`}
                                    action={<Button variant="outlined" size="small" onClick={() => openWeeklyAttendanceTrend("rates")}>Trend</Button>}
                                />
                                <KpiCard
                                    label="Late Cancel Rate"
                                    value={`${formatNumber(totals.late_cancel_rate)}%`}
                                    action={<Button variant="outlined" size="small" onClick={() => openWeeklyAttendanceTrend("rates")}>Trend</Button>}
                                />
                                <KpiCard label="Active Clients" value={formatNumber(totals.active_clients)} />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                                <WeeklyAttendanceComparisonChart
                                    rows={weeklyAttendanceComparisonRows}
                                    wide
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_attendance_weekday")}>
                                            Weekday Detail
                                        </Button>
                                    )}
                                />
                                <BookingQualityChart
                                    rows={attendance?.booking_quality_by_date}
                                    wide
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_booking_quality_weekday")}>
                                            Weekday Detail
                                        </Button>
                                    )}
                                />
                                <CompletedVisitsByHourChart
                                    rows={attendance?.attended_by_hour}
                                    wide
                                    action={(
                                        <Button variant="outlined" size="small" onClick={openOccupancyHourMatrix}>
                                            Hour Matrix
                                        </Button>
                                    )}
                                />
                                <CompletedVisitsRankingChart title="Completed Visits by Instructor" rows={attendance?.attended_by_instructor} />
                                <BreakdownTable title="Completed Visits by Studio" rows={attendance?.attended_by_studio} />
                                <CompletedVisitsRankingChart title="Completed Visits by Service" rows={attendance?.attended_by_service} wide />
                                <InstructorQualityTable rows={attendance?.instructor_quality} />
                            </div>
                        </>
                    )}

                    {activeTab === "retention" && (
                        <>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                                <InsightCard
                                    title="Current Member Mix"
                                    value={formatNumber(retention?.current_month_members)}
                                    caption="How current members are entering the month."
                                    details={[
                                        { label: "Renewal rate", value: formatPercent(retention?.renewal_rate) },
                                        { label: "Retained", value: formatNumber(retention?.retained_members) },
                                        { label: "New", value: formatNumber(retention?.new_members) },
                                        { label: "Reactivated", value: formatNumber(retention?.reactivated_members) },
                                    ]}
                                    action={(
                                        <Button variant="outlined" size="small" onClick={() => setExpandedInsight("member_mix")}>
                                            View History
                                        </Button>
                                    )}
                                />
                                <InsightCard
                                    title="Not Renewed Follow-up"
                                    value={formatNumber(retention?.not_renewed_members ?? retention?.not_renewed_services)}
                                    caption="Members who need attention after not renewing."
                                    details={[
                                        { label: "Inactive", value: formatNumber(retention?.not_renewed_inactive) },
                                        { label: "Attending unpaid", value: formatNumber(retention?.not_renewed_attending_unpaid) },
                                        { label: "Attending paid", value: formatNumber(retention?.not_renewed_attending_paid) },
                                    ]}
                                    action={(
                                        <Link href={retentionFollowUpHref}>
                                            <Button variant="outlined" size="small">Open Follow-up List</Button>
                                        </Link>
                                    )}
                                />
                                <InsightCard
                                    title="Value at Risk"
                                    value={formatMoney(retention?.not_renewed_value)}
                                    caption="Estimated membership value from not-renewed clients."
                                    details={[
                                        { label: "Post-expiration visits", value: formatNumber(retention?.not_renewed_post_expiration_attendance) },
                                        { label: "Paid visits", value: formatNumber(retention?.not_renewed_post_expiration_paid_attendance) },
                                        { label: "Unpaid visits", value: formatNumber(retention?.not_renewed_post_expiration_unpaid_attendance) },
                                    ]}
                                />
                            </div>
                            <MemberTrendChart rows={retentionTrendRows} />

                            {retention?.tracked_pricing_options === 0 && (
                                <Alert severity="warning">
                                    No hay productos marcados para analizar retencion. Marca las membresias en Data &gt; Pricing Options.
                                </Alert>
                            )}
                            {retention?.snapshot_rows === 0 && (
                                <Alert severity="warning">
                                    No hay snapshots mensuales para este periodo. Abre Retention Follow-up y reconstruye el mes.
                                </Alert>
                            )}

                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
                                <RetentionSummaryTableCard
                                    title="Not Renewed Clients"
                                    rows={retention?.not_renewed_clients}
                                    tableKey="not_renewed"
                                    onExpand={() => openRetentionTable("not_renewed")}
                                />
                                <RetentionSummaryTableCard
                                    title="Retained Members"
                                    rows={retention?.retained_samples}
                                    tableKey="retained"
                                    onExpand={() => openRetentionTable("retained")}
                                />
                                <RetentionSummaryTableCard
                                    title="New Members"
                                    rows={retention?.new_member_samples}
                                    tableKey="new_members"
                                    onExpand={() => openRetentionTable("new_members")}
                                />
                                <RetentionSummaryTableCard
                                    title="Reactivated Members"
                                    rows={retention?.reactivated_samples}
                                    tableKey="reactivated"
                                    onExpand={() => openRetentionTable("reactivated")}
                                />
                            </div>

                            <div>
                                <Link href={retentionFollowUpHref}>
                                    <Button variant="outlined">Open Retention Follow-up</Button>
                                </Link>
                            </div>
                        </>
                    )}

                    {activeTab === "conversion" && (
                        <ConversionDashboardSection
                            conversion={conversion}
                            comparisonConversion={comparisonConversion}
                            periodLabel={periodLabel}
                            mode={dashboardMode}
                            onOpenTrend={openConversionTrend}
                        />
                    )}

                    {activeTab === "occupancy" && (
                        <>
                            <CapacityUsageCard
                                occupation={occupation}
                                action={
                                    <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_occupancy_health")}>
                                        View Trend
                                    </Button>
                                }
                            />
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                                <OccupancyCapacityByDayChart
                                    rows={occupation?.by_day}
                                    action={
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            <Button variant="outlined" size="small" onClick={() => openWeeklyTrend("weekly_occupancy_weekday")}>
                                                Weekday Detail
                                            </Button>
                                            <Button variant="outlined" size="small" onClick={openOccupancyHourMatrix}>
                                                Hour Matrix
                                            </Button>
                                        </Stack>
                                    }
                                />
                                <WeeklyOccupancyComparisonChart rows={weeklyOccupancyComparisonRows} />
                            </div>

                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                                <OccupationTable title="Occupancy by Room" rows={occupation?.by_room_capacity} />
                                <OccupancySlotTable title="Lowest Occupancy Slots" rows={lowOccupancySlots} />
                                <OccupancySlotTable title="Highest Occupancy Slots" rows={highOccupancySlots} />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <Dialog
                open={expandedInsight === "revenue_health"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Revenue Health Trend</span>
                        <IconButton aria-label="Close revenue trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <RevenueHealthTrendChart rows={revenueTrendRows} />
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "retention_health"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Retention Health Trend</span>
                        <IconButton aria-label="Close retention trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <RetentionHealthTrendChart rows={retentionHealthTrendRows} />
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "member_mix"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Current Member Mix History</span>
                        <IconButton aria-label="Close member mix history" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={memberMixTrendView}
                        onChange={(_, value) => setMemberMixTrendView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label="Members" value="members" />
                        <Tab label="Renewal Rate" value="renewal" />
                        <Tab label="Movement" value="movement" />
                    </Tabs>
                    <MemberMixHistoryChart rows={memberMixTrendRows} view={memberMixTrendView} />
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "retention_tables"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="xl"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Retention Detail Tables</span>
                        <IconButton aria-label="Close retention tables" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={activeRetentionTable}
                        onChange={(_, value) => setActiveRetentionTable(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label={`Not Renewed (${formatNumber(retentionTables?.not_renewed?.count || 0)})`} value="not_renewed" />
                        <Tab label={`Retained (${formatNumber(retentionTables?.retained?.count || 0)})`} value="retained" />
                        <Tab label={`New (${formatNumber(retentionTables?.new_members?.count || 0)})`} value="new_members" />
                        <Tab label={`Reactivated (${formatNumber(retentionTables?.reactivated?.count || 0)})`} value="reactivated" />
                    </Tabs>
                    {retentionTablesLoading ? (
                        <LinearProgress />
                    ) : (
                        <RetentionDetailTable
                            rows={retentionTables?.[activeRetentionTable]?.rows || []}
                            tableKey={activeRetentionTable}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "weekly_attendance_health"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Attendance Health Trend</span>
                        <IconButton aria-label="Close attendance health trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={weeklyAttendanceTrendView}
                        onChange={(_, value) => setWeeklyAttendanceTrendView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label="Bookings & Visits" value="visits" />
                        <Tab label="No-show & Late Cancel" value="rates" />
                        <Tab label="Avg Revenue / Visit" value="revenue" />
                    </Tabs>
                    {weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <WeeklyAttendanceHealthTrendChart rows={weeklyTrendRows} view={weeklyAttendanceTrendView} />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "weekly_occupancy_health"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Occupancy Health Trend</span>
                        <IconButton aria-label="Close occupancy health trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={weeklyOccupancyTrendView}
                        onChange={(_, value) => setWeeklyOccupancyTrendView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label="Capacity Used" value="capacity" />
                        <Tab label="Occupancy Rate" value="rate" />
                        <Tab label="Scheduled Classes" value="classes" />
                    </Tabs>
                    {weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <WeeklyOccupancyHealthTrendChart rows={weeklyTrendRows} view={weeklyOccupancyTrendView} />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "weekly_attendance_weekday"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Completed Visits by Weekday</span>
                        <IconButton aria-label="Close completed visits weekday detail" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={weeklyDrilldownWeekday}
                        onChange={(_, value) => setWeeklyDrilldownWeekday(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        {weekdayNames.map((weekday) => (
                            <Tab key={weekday} label={weekday} value={weekday} />
                        ))}
                    </Tabs>
                    {weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <WeeklyWeekdayDrilldownChart rows={weeklyWeekdayDrilldownRows} metric="attendance" />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "weekly_occupancy_weekday"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Occupancy by Weekday</span>
                        <IconButton aria-label="Close occupancy weekday detail" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={weeklyDrilldownWeekday}
                        onChange={(_, value) => setWeeklyDrilldownWeekday(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        {weekdayNames.map((weekday) => (
                            <Tab key={weekday} label={weekday} value={weekday} />
                        ))}
                    </Tabs>
                    {weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <WeeklyWeekdayDrilldownChart rows={weeklyWeekdayDrilldownRows} metric="occupancy" />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "conversion_trend"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Trial Conversion Trend</span>
                        <IconButton aria-label="Close trial conversion trend" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={conversionTrendView}
                        onChange={(_, value) => setConversionTrendView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label="Trial Activity" value="activity" />
                        <Tab label="Conversion Rates" value="rates" />
                    </Tabs>
                    {dashboardMode === "weekly" && weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <ConversionTrendChart rows={conversionTrendRows} view={conversionTrendView} />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "occupancy_hour_matrix"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="xl"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Occupancy by Hour Matrix</span>
                        <IconButton aria-label="Close occupancy hour matrix" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={occupancyHourMatrixView}
                        onChange={(_, value) => setOccupancyHourMatrixView(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        <Tab label="Current Week" value="current_week" />
                        <Tab label="Weekday History" value="history" />
                    </Tabs>
                    {occupancyHourMatrixView === "history" && (
                        <Tabs
                            value={weeklyDrilldownWeekday}
                            onChange={(_, value) => setWeeklyDrilldownWeekday(value)}
                            variant="scrollable"
                            scrollButtons="auto"
                            style={{ marginBottom: "16px" }}
                        >
                            {weekdayNames.map((weekday) => (
                                <Tab key={weekday} label={weekday} value={weekday} />
                            ))}
                        </Tabs>
                    )}
                    {occupancyHourMatrixLoading ? (
                        <LinearProgress />
                    ) : (
                        <OccupancyHourMatrix
                            data={occupancyHourMatrix}
                            view={occupancyHourMatrixView}
                            weekday={weeklyDrilldownWeekday}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={expandedInsight === "weekly_booking_quality_weekday"}
                onClose={() => setExpandedInsight(null)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <span>Booking Quality by Weekday</span>
                        <IconButton aria-label="Close booking quality weekday detail" onClick={() => setExpandedInsight(null)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={weeklyDrilldownWeekday}
                        onChange={(_, value) => setWeeklyDrilldownWeekday(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{ marginBottom: "16px" }}
                    >
                        {weekdayNames.map((weekday) => (
                            <Tab key={weekday} label={weekday} value={weekday} />
                        ))}
                    </Tabs>
                    {weeklyTrendsLoading ? (
                        <LinearProgress />
                    ) : (
                        <BookingQualityWeekdayHistoryChart rows={weeklyWeekdayDrilldownRows} />
                    )}
                </DialogContent>
            </Dialog>
        </MainPage>
    );
}

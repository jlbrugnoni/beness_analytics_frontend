import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
    Bar,
    BarChart as RechartsBarChart,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from "recharts";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
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
const chartLegendStyle = { fontSize: 15, paddingTop: 8 };


const KpiCard = ({ label, value }) => (
    <Paper style={{ padding: "18px", minHeight: "96px" }}>
        <div style={{ color: "#555", fontSize: "15px", fontWeight: 700 }}>{label}</div>
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


const MemberTrendChart = ({ rows }) => (
    <Paper style={{ padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Member Trend</h2>
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 16, right: 20, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" tick={chartText} />
                    <YAxis allowDecimals={false} tick={chartText} />
                    <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={chartTooltipStyle} />
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
                </ComposedChart>
            </ResponsiveContainer>
        </div>
        {!rows.length && <div>No data</div>}
    </Paper>
);


const RevenueItemChart = ({ rows }) => {
    const chartRows = (rows || []).slice(0, 10).map((row) => ({
        label: row.name || "N/A",
        total: Number(row.total || 0),
        count: Number(row.count || 0),
    }));
    const chartHeight = Math.max(360, chartRows.length * 54 + 90);

    return (
        <Paper style={{ padding: "16px" }}>
            <h2 style={{ marginTop: 0 }}>Revenue by Item</h2>
            <div style={{ width: "100%", height: chartHeight }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 32, bottom: 16, left: 12 }}>
                        <CartesianGrid stroke="#eef1f4" horizontal={false} />
                        <XAxis type="number" tickFormatter={formatCompactMoney} tick={chartText} />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={240}
                            tick={chartText}
                            tickFormatter={(value) => truncateLabel(value, 32)}
                        />
                        <ChartTooltip
                            formatter={(value) => [formatMoney(value), "Revenue"]}
                            labelFormatter={(value) => value}
                            contentStyle={chartTooltipStyle}
                        />
                        <Bar dataKey="total" name="Revenue" fill="#2f6f73" radius={[0, 4, 4, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
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


const CompletedVisitsByHourChart = ({ rows, wide = false }) => {
    const chartRows = (rows || []).map((row) => ({
        hour: row.hour || "N/A",
        total: Number(row.total || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
            <h2 style={{ marginTop: 0 }}>Completed Visits by Hour</h2>
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


const WeeklyAttendanceComparisonChart = ({ rows, wide = false }) => (
    <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
        <h2 style={{ marginTop: 0 }}>Completed Visits vs Previous Week</h2>
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


const BookingQualityChart = ({ rows, wide = false }) => {
    const chartRows = (rows || []).map((row) => ({
        label: formatShortWeekdayDate(row.date),
        attended: Number(row.attended || 0),
        no_shows: Number(row.no_shows || 0),
        late_cancels: Number(row.late_cancels || 0),
    }));

    return (
        <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
            <h2 style={{ marginTop: 0 }}>Booking Quality by Day</h2>
            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <RechartsBarChart data={chartRows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="#eef1f4" vertical={false} />
                        <XAxis dataKey="label" tick={chartText} />
                        <YAxis allowDecimals={false} tick={chartText} />
                        <ChartTooltip formatter={(value) => formatNumber(value)} contentStyle={chartTooltipStyle} />
                        <Legend wrapperStyle={chartLegendStyle} />
                        <Bar dataKey="attended" name="Completed visits" stackId="bookings" fill="#2f6f73" />
                        <Bar dataKey="late_cancels" name="Late cancels" stackId="bookings" fill="#d97706" />
                        <Bar dataKey="no_shows" name="No-shows" stackId="bookings" fill="#b42318" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
    );
};


const WeeklyOccupancyComparisonChart = ({ rows, wide = false }) => (
    <Paper style={{ padding: "16px", gridColumn: wide ? "span 2" : "auto" }}>
        <h2 style={{ marginTop: 0 }}>Occupancy vs Previous Week</h2>
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


const OccupancyCapacityByDayChart = ({ rows }) => {
    const chartRows = (rows || []).map((row) => {
        const capacity = Number(row.capacity || 0);
        const attended = Number(row.attended || 0);
        return {
            label: formatShortWeekdayDate(row.date),
            attended,
            unused_capacity: Math.max(0, capacity - attended),
            capacity,
            occupation_rate: Number(row.occupation_rate || 0),
        };
    });

    return (
        <Paper style={{ padding: "16px" }}>
            <h2 style={{ marginTop: 0 }}>Capacity Used by Day</h2>
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
                        <Bar dataKey="attended" name="Attendance used" stackId="capacity" fill="#2f6f73" />
                        <Bar dataKey="unused_capacity" name="Unused capacity" stackId="capacity" fill="#d8dee4" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            {!chartRows.length && <div>No data</div>}
        </Paper>
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


const CapacityUsageCard = ({ occupation }) => {
    const capacity = Number(occupation?.scheduled_capacity || 0);
    const attended = Number(occupation?.matched_attended_visits || 0);
    const width = capacity ? Math.min(100, Math.max(0, (attended / capacity) * 100)) : 0;

    return (
        <Paper style={{ padding: "18px", display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "baseline" }}>
                <div>
                    <h2 style={{ margin: 0 }}>Capacity Used</h2>
                    <div style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>Attendance compared with scheduled capacity.</div>
                </div>
                <strong style={{ fontSize: "30px" }}>{formatPercent(occupation?.occupation_rate)}</strong>
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
    ],
    weekly: [
        { label: "Summary", value: "weekly_overview" },
        { label: "Attendance", value: "attendance" },
        { label: "Occupancy", value: "occupancy" },
    ],
};


export default function Dashboard() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const defaultMonth = lastCompletedMonthValue();
    const defaultWeek = weekRange();

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [periodModes, setPeriodModes] = useState({
        monthly: "last_completed_month",
        weekly: "current_week",
    });
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [periodNavigationVersion, setPeriodNavigationVersion] = useState(0);
    const [filters, setFilters] = useState({
        site: "",
        studio: "",
        month: defaultMonth,
        week_date: defaultWeek.date_from,
        date_from: defaultWeek.date_from,
        date_to: defaultWeek.date_to,
    });
    const [summary, setSummary] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [retention, setRetention] = useState(null);
    const [occupation, setOccupation] = useState(null);
    const [comparisonSummary, setComparisonSummary] = useState(null);
    const [comparisonRetention, setComparisonRetention] = useState(null);
    const [comparisonAttendance, setComparisonAttendance] = useState(null);
    const [comparisonOccupation, setComparisonOccupation] = useState(null);
    const [retentionTrend, setRetentionTrend] = useState(null);
    const [dashboardMode, setDashboardMode] = useState("monthly");
    const [activeTab, setActiveTab] = useState("monthly_overview");
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
            url = response.data.next || null;
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
                setComparisonSummary(dashboardData.comparison.summary);
                setComparisonRetention(dashboardData.comparison.retention);
                setRetentionTrend(trendResponse.data);
                setComparisonAttendance(null);
                setComparisonOccupation(null);
                setAttendance(null);
                setOccupation(null);
            } else {
                const dashboardResponse = await axios.get(`${backendUrl}/api/data/analytics/dashboard/weekly/?${queryString}`, authHeaders);
                const dashboardData = dashboardResponse.data;
                setSummary(dashboardData.current.summary);
                setAttendance(dashboardData.current.attendance);
                setOccupation(dashboardData.current.occupation);
                setComparisonSummary(dashboardData.comparison.summary);
                setComparisonAttendance(dashboardData.comparison.attendance);
                setComparisonOccupation(dashboardData.comparison.occupation);
                setComparisonRetention(null);
                setRetentionTrend(null);
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
        fetchDashboard();
    }, [token, dashboardMode, periodNavigationVersion]);

    const totals = summary?.totals || {};
    const comparisonTotals = comparisonSummary?.totals || {};
    const periodLabel = dashboardMode === "monthly" ? "month" : "week";
    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const activePeriodMode = periodModes[dashboardMode];
    const activeDateRange = selectedDateRange(dashboardMode, periodModes, filters);
    const activePeriodTitle = formatPeriodTitle(dashboardMode, activeDateRange);
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
                                    ]}
                                    action={(
                                        <Link href="/retention">
                                            <Button variant="outlined" size="small">Open Retention Follow-up</Button>
                                        </Link>
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
                                <WeeklyAttendanceComparisonChart rows={weeklyAttendanceComparisonRows} wide />
                                <WeeklyOccupancyComparisonChart rows={weeklyOccupancyComparisonRows} wide />
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
                                <KpiCard label="Total Bookings" value={formatNumber(totals.attendance_visits)} />
                                <KpiCard label="Completed Visits" value={formatNumber(totals.attended_visits)} />
                                <KpiCard label="Avg Revenue / Visit" value={formatMoney(totals.average_revenue_per_attended_visit)} />
                                <KpiCard label="No-show Rate" value={`${formatNumber(totals.no_show_rate)}%`} />
                                <KpiCard label="Late Cancel Rate" value={`${formatNumber(totals.late_cancel_rate)}%`} />
                                <KpiCard label="Active Clients" value={formatNumber(totals.active_clients)} />
                            </div>
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                                <WeeklyAttendanceComparisonChart rows={weeklyAttendanceComparisonRows} wide />
                                <BookingQualityChart rows={attendance?.booking_quality_by_date} wide />
                                <CompletedVisitsByHourChart rows={attendance?.attended_by_hour} wide />
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
                                        <Link href="/retention">
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
                                <RetentionTable title="Not Renewed Clients" rows={retention?.not_renewed_clients} />
                                <RetentionTable title="Retained Samples" rows={retention?.retained_samples} />
                                <RetentionTable title="New Member Samples" rows={retention?.new_member_samples} />
                                <RetentionTable title="Reactivated Samples" rows={retention?.reactivated_samples} />
                            </div>

                            <div>
                                <Link href="/retention">
                                    <Button variant="outlined">Open Retention Follow-up</Button>
                                </Link>
                            </div>
                        </>
                    )}

                    {activeTab === "occupancy" && (
                        <>
                            <CapacityUsageCard occupation={occupation} />
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                                <OccupancyCapacityByDayChart rows={occupation?.by_day} />
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
        </MainPage>
    );
}

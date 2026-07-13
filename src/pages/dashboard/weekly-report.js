import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon from "@mui/icons-material/Download";
import {
    Bar,
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
import benessLogo from "@/images/beness-logo.png";
import useFetchToken from "@/components/useFetchUserId";
import useI18n from "@/hooks/useI18n";
import { normalizeApiNextUrl } from "@/utils/apiPagination";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {
    addDays,
    chartLegendStyle,
    chartText,
    chartTooltipStyle,
    completedColor,
    firstQueryValue,
    formatDisplayDate,
    formatNumber,
    formatPercent,
    formatPercentOneDecimal,
    formatPeriodTitle,
    formatShortWeekdayDate,
    previousWeekRange,
    weekRange,
    weekRangeFromDate,
} from "@/utils/dashboardHelpers";


const STORAGE_KEY = "beness.dashboard.weeklyReport";
const DEFAULT_PERIOD_MODE = "current_week";
const EXPORT_IMAGE_WIDTH = 2500;
const EXPORT_IMAGE_SCALE = 3;
const EXPORT_TABLE_WIDTH = 820;
const EXPORT_CHART_PANEL_HEIGHT = 380;
const EXPORT_CHART_HEIGHT = 332;
const EXPORT_CHART_GRID_GAP = 12;
const EXPORT_CHART_GRID_HEIGHT = EXPORT_CHART_PANEL_HEIGHT * 3 + EXPORT_CHART_GRID_GAP * 2;


const buildDefaultState = () => {
    const defaultWeek = weekRange();
    return {
        periodMode: DEFAULT_PERIOD_MODE,
        filters: {
            site: "",
            studio: "",
            week_date: defaultWeek.date_from,
            date_from: defaultWeek.date_from,
            date_to: defaultWeek.date_to,
        },
    };
};


const stateFromQuery = (query, fallback) => {
    const period = firstQueryValue(query.period);
    const validPeriods = ["current_week", "previous_week", "specific_week", "range"];
    return {
        periodMode: validPeriods.includes(period) ? period : fallback.periodMode,
        filters: {
            site: firstQueryValue(query.site) || fallback.filters.site,
            studio: firstQueryValue(query.studio) || fallback.filters.studio,
            week_date: firstQueryValue(query.week_date) || fallback.filters.week_date,
            date_from: firstQueryValue(query.date_from) || fallback.filters.date_from,
            date_to: firstQueryValue(query.date_to) || fallback.filters.date_to,
        },
    };
};


const hasQuery = (query) =>
    ["site", "studio", "period", "week_date", "date_from", "date_to"].some((key) => firstQueryValue(query?.[key]));


const queryFromState = (periodMode, filters) => {
    const query = {
        period: periodMode,
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


const resolveActiveDateRange = (periodMode, filters) => {
    if (periodMode === "current_week") return weekRange();
    if (periodMode === "previous_week") return previousWeekRange();
    if (periodMode === "specific_week") return weekRangeFromDate(filters.week_date);
    return { date_from: filters.date_from, date_to: filters.date_to };
};


const formatTooltipValue = (value, name) => {
    if (String(name || "").toLowerCase().includes("rate") || String(name || "").includes("%")) {
        return [formatPercent(value), name];
    }
    return [formatNumber(value), name];
};


const barValueLabelStyle = { fill: "#ffffff", fontSize: 13, fontWeight: 800 };


const formatHourLabel = (value) => {
    const hour = Number(String(value || "").split(":")[0]);
    if (Number.isNaN(hour)) return value;
    if (hour === 0) return "12am";
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return "12pm";
    return `${hour - 12}pm`;
};


const buildReportFileName = (scope, dateFrom, dateTo) => {
    const safeScope = String(scope || "weekly-report")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return `weekly-report-${safeScope || "all-sites"}-${dateFrom || "from"}-${dateTo || "to"}.png`;
};


const waitForReportPaint = async () => {
    if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 150));
};


const swapChartSvgsForImages = async (container) => {
    const swaps = [];
    const svgs = Array.from(container.querySelectorAll("svg.recharts-surface"));

    await Promise.all(svgs.map((svg) => new Promise((resolve) => {
        const rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height || !svg.parentNode) {
            resolve();
            return;
        }

        const clone = svg.cloneNode(true);
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", String(rect.width));
        clone.setAttribute("height", String(rect.height));
        clone.setAttribute("viewBox", clone.getAttribute("viewBox") || `0 0 ${rect.width} ${rect.height}`);

        const serialized = new XMLSerializer().serializeToString(clone);
        const sourceImage = new Image();
        sourceImage.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = window.devicePixelRatio || 1;
            canvas.width = Math.ceil(rect.width * scale);
            canvas.height = Math.ceil(rect.height * scale);
            const context = canvas.getContext("2d");
            context.scale(scale, scale);
            context.drawImage(sourceImage, 0, 0, rect.width, rect.height);

            const chartImage = new Image();
            chartImage.alt = "";
            chartImage.style.display = "block";
            chartImage.style.width = `${rect.width}px`;
            chartImage.style.height = `${rect.height}px`;
            chartImage.onload = () => {
                svg.parentNode.replaceChild(chartImage, svg);
                swaps.push({ image: chartImage, svg });
                resolve();
            };
            chartImage.onerror = () => resolve();
            chartImage.src = canvas.toDataURL("image/png");
        };
        sourceImage.onerror = () => resolve();
        sourceImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    })));

    await Promise.all(swaps.map(({ image }) => {
        if (image.decode) {
            return image.decode().catch(() => {});
        }
        return Promise.resolve();
    }));

    return () => {
        swaps.reverse().forEach(({ image, svg }) => {
            if (image.parentNode) {
                image.parentNode.replaceChild(svg, image);
            }
        });
    };
};


function ChartPanel({ title, children, exportMode = false }) {
    return (
        <Paper style={{
            padding: exportMode ? "10px" : "16px",
            display: "grid",
            gap: exportMode ? "6px" : "12px",
            minHeight: exportMode ? 0 : 390,
            height: exportMode ? EXPORT_CHART_PANEL_HEIGHT : "auto",
            boxSizing: "border-box",
            overflow: exportMode ? "hidden" : "visible",
        }}>
            <Typography variant="subtitle1" fontWeight={800} style={{ fontSize: exportMode ? 14 : undefined, lineHeight: 1.15 }}>
                {title}
            </Typography>
            <div style={{ width: "100%", height: exportMode ? EXPORT_CHART_HEIGHT : 320, minHeight: exportMode ? EXPORT_CHART_HEIGHT : undefined }}>
                {children}
            </div>
        </Paper>
    );
}


function TrialClassesChart({ rows, t, animate = true, exportMode = false }) {
    return (
        <ChartPanel title={t("weeklyReport.charts.trials")} exportMode={exportMode}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" interval={0} tick={chartText} />
                    <YAxis allowDecimals={false} tick={chartText} />
                    <ChartTooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="attended_trials" name={t("weeklyReport.metrics.attendedTrials")} fill={completedColor} radius={[4, 4, 0, 0]} isAnimationActive={animate}>
                        <LabelList dataKey="attended_trials" position="insideTop" formatter={formatNumber} style={barValueLabelStyle} />
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}


function ConversionChart({ rows, t, animate = true, exportMode = false }) {
    return (
        <ChartPanel title={t("weeklyReport.charts.conversions")} exportMode={exportMode}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 24, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" interval={0} tick={chartText} />
                    <YAxis allowDecimals={false} tick={chartText} />
                    <ChartTooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={chartLegendStyle} />
                    <Bar dataKey="converted_members" stackId="conversions" name={t("weeklyReport.metrics.convertedMembers")} fill={completedColor} isAnimationActive={animate}>
                        <LabelList dataKey="converted_members" position="center" formatter={formatNumber} style={barValueLabelStyle} />
                    </Bar>
                    <Bar dataKey="converted_non_members" stackId="conversions" name={t("weeklyReport.metrics.convertedNonMembers")} fill="#d97706" radius={[4, 4, 0, 0]} isAnimationActive={animate}>
                        <LabelList dataKey="converted_non_members" position="center" formatter={formatNumber} style={barValueLabelStyle} />
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}


function OccupancyChart({ rows, t, animate = true, exportMode = false }) {
    return (
        <ChartPanel title={t("weeklyReport.charts.occupancy")} exportMode={exportMode}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 24, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" interval={0} tick={chartText} />
                    <YAxis tickFormatter={(value) => `${value}%`} tick={chartText} />
                    <ChartTooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
                    <Line
                        type="monotone"
                        dataKey="occupation_rate"
                        name={t("common.occupancy")}
                        stroke={completedColor}
                        strokeWidth={3}
                        dot={animate ? { r: 4 } : false}
                        activeDot={animate ? { r: 5 } : false}
                        isAnimationActive={animate}
                    >
                        <LabelList
                            dataKey="occupation_rate"
                            position="top"
                            formatter={(value) => formatPercentOneDecimal(value)}
                            style={{ fill: "#172033", fontSize: 13, fontWeight: 800 }}
                        />
                    </Line>
                </ComposedChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}


function AssistancesChart({ rows, t, animate = true, exportMode = false }) {
    return (
        <ChartPanel title={t("weeklyReport.charts.attendance")} exportMode={exportMode}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" interval={0} tick={chartText} />
                    <YAxis allowDecimals={false} tick={chartText} />
                    <ChartTooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="attendance_used" name={t("weeklyReport.metrics.assistances")} fill={completedColor} radius={[4, 4, 0, 0]} isAnimationActive={animate}>
                        <LabelList dataKey="attendance_used" position="insideTop" formatter={formatNumber} style={barValueLabelStyle} />
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}


function AssistancesByHourChart({ rows, t, animate = true, exportMode = false }) {
    return (
        <ChartPanel title={t("weeklyReport.charts.assistancesByHour")} exportMode={exportMode}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="hour_label" interval={0} tick={chartText} />
                    <YAxis allowDecimals={false} tick={chartText} />
                    <ChartTooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="assistances" name={t("weeklyReport.metrics.assistances")} fill="#0891b2" radius={[4, 4, 0, 0]} isAnimationActive={animate}>
                        <LabelList dataKey="assistances" position="insideTop" formatter={formatNumber} style={barValueLabelStyle} />
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}


function EffectiveClassesChart({ rows, t, animate = true, exportMode = false }) {
    return (
        <ChartPanel title={t("weeklyReport.charts.effectiveClasses")} exportMode={exportMode}>
            <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#eef1f4" vertical={false} />
                    <XAxis dataKey="label" interval={0} tick={chartText} />
                    <YAxis allowDecimals={false} tick={chartText} />
                    <ChartTooltip formatter={formatTooltipValue} contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={chartLegendStyle} />
                    <Bar dataKey="effective_classes" stackId="classes" name={t("weeklyReport.metrics.effectiveClasses")} fill="#8a5cf6" isAnimationActive={animate}>
                        <LabelList dataKey="effective_classes" position="center" formatter={formatNumber} style={barValueLabelStyle} />
                    </Bar>
                    <Bar dataKey="not_attended_classes" stackId="classes" name={t("weeklyReport.metrics.notAttendedClasses")} fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={animate}>
                        <LabelList dataKey="not_attended_classes" position="center" formatter={formatNumber} style={barValueLabelStyle} />
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}


function StaffTable({ rows, weeks, t, exportMode = false }) {
    const instructorRows = Object.values((rows || []).reduce((lookup, row) => {
        const key = row.staff_member_id || row.name || "unassigned";
        if (!lookup[key]) {
            lookup[key] = {
                key,
                name: row.name || "N/A",
                totalAssistances: 0,
                totalEffectiveClasses: 0,
                weeks: {},
            };
        }
        lookup[key].totalAssistances += Number(row.assistances || 0);
        lookup[key].totalEffectiveClasses += Number(row.effective_classes || 0);
        lookup[key].weeks[row.week_start] = row;
        return lookup;
    }, {})).sort((a, b) => (
        b.totalAssistances - a.totalAssistances
        || b.totalEffectiveClasses - a.totalEffectiveClasses
        || a.name.localeCompare(b.name)
    ));

    return (
        <Paper style={{
            padding: exportMode ? "10px" : "16px",
            gridColumn: exportMode ? "auto" : "1 / -1",
            height: exportMode ? "100%" : "auto",
            boxSizing: "border-box",
            overflow: exportMode ? "hidden" : "visible",
            display: exportMode ? "grid" : "block",
            gridTemplateRows: exportMode ? "auto auto minmax(0, 1fr)" : undefined,
        }}>
            <Typography variant="subtitle1" fontWeight={800} style={{ marginBottom: 12 }}>
                {t("weeklyReport.tables.staff")}
            </Typography>
            <Typography variant="body2" color="text.secondary" style={{ marginTop: -6, marginBottom: 12 }}>
                {t("weeklyReport.metrics.classesAssistances")}
            </Typography>
            <TableContainer style={{ maxHeight: exportMode ? "100%" : 440, overflow: exportMode ? "hidden" : undefined }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ fontSize: exportMode ? 14 : undefined, fontWeight: exportMode ? 800 : undefined }}>{t("common.instructor")}</TableCell>
                            {(weeks || []).map((week) => (
                                <TableCell key={week.week_start} align="center" style={{ fontSize: exportMode ? 14 : undefined, fontWeight: exportMode ? 800 : undefined }}>
                                    {formatShortWeekdayDate(week.week_start, t)}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {instructorRows.map((row) => (
                            <TableRow key={row.key}>
                                <TableCell style={{ fontSize: exportMode ? 14 : undefined }}>{row.name}</TableCell>
                                {(weeks || []).map((week) => {
                                    const weekRow = row.weeks[week.week_start];
                                    return (
                                        <TableCell key={`${row.key}-${week.week_start}`} align="center" style={{ fontSize: exportMode ? 14 : undefined }}>
                                            {weekRow ? (
                                                <strong>
                                                    {formatNumber(weekRow.effective_classes)} / {formatNumber(weekRow.assistances)}
                                                </strong>
                                            ) : (
                                                <span style={{ color: "#9ca3af" }}>-</span>
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                        {!instructorRows.length && (
                            <TableRow>
                                <TableCell colSpan={(weeks || []).length + 1} style={{ fontSize: exportMode ? 14 : undefined }}>{t("common.noData")}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}


export default function WeeklyReportPage() {
    const token = useFetchToken();
    const router = useRouter();
    const { t } = useI18n();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const initialState = useMemo(() => buildDefaultState(), []);

    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [filters, setFilters] = useState(initialState.filters);
    const [periodMode, setPeriodMode] = useState(initialState.periodMode);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [filtersHydrated, setFiltersHydrated] = useState(false);
    const [periodNavigationVersion, setPeriodNavigationVersion] = useState(0);
    const [report, setReport] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [exportingImage, setExportingImage] = useState(false);
    const reportExportRef = useRef(null);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const activeDateRange = useMemo(
        () => resolveActiveDateRange(periodMode, filters),
        [periodMode, filters.week_date, filters.date_from, filters.date_to],
    );

    const activePeriodTitle = formatPeriodTitle("weekly", activeDateRange, t);
    const visibleStudios = filters.site
        ? studios.filter((studio) => String(studio.site) === String(filters.site))
        : studios;
    const selectedSite = sites.find((site) => String(site.id) === String(filters.site));
    const selectedStudio = studios.find((studio) => String(studio.id) === String(filters.studio));
    const reportScope = selectedStudio?.name || selectedSite?.name || t("dashboard.allSites");
    const reportWeekLabel = `${formatDisplayDate(report?.date_range?.from || activeDateRange.date_from, t)} - ${formatDisplayDate(report?.date_range?.to || activeDateRange.date_to, t)}`;

    const weekRows = (report?.weeks || []).map((row) => ({
        ...row,
        label: formatShortWeekdayDate(row.week_start, t),
        trial_bookings: row.trial_bookings || 0,
        attended_trials: row.attended_trials || 0,
        converted_clients: row.converted_clients || 0,
        converted_members: row.converted_members || 0,
        converted_non_members: row.converted_non_members || 0,
        client_conversion_rate: row.client_conversion_rate || 0,
        member_conversion_rate: row.member_conversion_rate || 0,
        occupation_rate: row.occupation_rate || 0,
        attendance_used: row.attendance_used || 0,
        effective_classes: row.effective_classes || 0,
        not_attended_classes: row.not_attended_classes || 0,
        total_booked_classes: row.total_booked_classes || row.scheduled_classes || 0,
        scheduled_classes: row.scheduled_classes || 0,
    }));

    const assistancesByHourRows = (report?.assistances_by_hour || []).map((row) => ({
        ...row,
        hour_label: formatHourLabel(row.hour),
        assistances: row.assistances || 0,
    }));
    const chartAnimationActive = !exportingImage;

    const currentWeek = weekRows[weekRows.length - 1] || {};

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

    const fetchReport = async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            const requestFilters = {
                site: filters.site,
                studio: filters.studio,
                ...activeDateRange,
            };
            Object.entries(requestFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await axios.get(
                `${backendUrl}/api/data/analytics/reports/weekly/?${params.toString()}`,
                authHeaders,
            );
            setReport(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Error loading weekly report.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    useEffect(() => {
        if (!router.isReady) return;
        let nextState = initialState;
        if (hasQuery(router.query)) {
            nextState = stateFromQuery(router.query, initialState);
        } else if (typeof window !== "undefined") {
            try {
                const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
                if (stored) {
                    nextState = {
                        periodMode: stored.periodMode || initialState.periodMode,
                        filters: { ...initialState.filters, ...(stored.filters || {}) },
                    };
                }
            } catch {
                nextState = initialState;
            }
        }
        setPeriodMode(nextState.periodMode);
        setFilters(nextState.filters);
        setFiltersHydrated(true);
    }, [router.isReady]);

    useEffect(() => {
        if (!filtersHydrated || !router.isReady) return;
        const state = { periodMode, filters };
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        const nextQuery = queryFromState(periodMode, filters);
        if (!sameQuery(router.query, nextQuery)) {
            router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
        }
    }, [filtersHydrated, router.isReady, periodMode, filters]);

    useEffect(() => {
        if (!filtersHydrated) return;
        fetchReport();
    }, [token, periodNavigationVersion, filtersHydrated]);

    const handleSiteChange = (event) => {
        setFilters({ ...filters, site: event.target.value, studio: "" });
        setPeriodNavigationVersion((v) => v + 1);
    };

    const handleStudioChange = (event) => {
        setFilters({ ...filters, studio: event.target.value });
        setPeriodNavigationVersion((v) => v + 1);
    };

    const navigatePeriod = (direction) => {
        const nextWeekDate = addDays(activeDateRange.date_from, direction * 7);
        const nextWeekRange = weekRangeFromDate(nextWeekDate);
        setPeriodMode("specific_week");
        setFilters({
            ...filters,
            week_date: nextWeekRange.date_from,
            date_from: nextWeekRange.date_from,
            date_to: nextWeekRange.date_to,
        });
        setPeriodNavigationVersion((v) => v + 1);
    };

    const downloadReportImage = async () => {
        if (!reportExportRef.current || !report) return;
        setExportingImage(true);
        setError("");
        let restoreCharts = () => {};
        try {
            await waitForReportPaint();
            restoreCharts = await swapChartSvgsForImages(reportExportRef.current);
            await waitForReportPaint();
            const html2canvas = (await import("html2canvas")).default;
            const exportHeight = Math.ceil(reportExportRef.current.scrollHeight);
            const canvas = await html2canvas(reportExportRef.current, {
                backgroundColor: "#ffffff",
                scale: EXPORT_IMAGE_SCALE,
                useCORS: true,
                width: EXPORT_IMAGE_WIDTH,
                height: exportHeight,
                windowWidth: EXPORT_IMAGE_WIDTH,
                windowHeight: exportHeight,
            });
            const imageUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = imageUrl;
            link.download = buildReportFileName(reportScope, report?.trend_date_range?.from, report?.trend_date_range?.to);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError(err.message || t("weeklyReport.exportError"));
        } finally {
            restoreCharts();
            setExportingImage(false);
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("weeklyReport.title")}</title>
            </Head>
            <div className={styles.container}>
                <div style={{ width: "100%", display: "grid", gap: "16px" }}>
                    <Stack direction="row" alignItems="center" spacing={1} style={{ marginBottom: "4px" }}>
                        <IconButton size="small" onClick={() => router.push("/dashboard")}>
                            <ArrowBackIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">
                            {t("dashboard.title")} / {t("weeklyReport.title")}
                        </Typography>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper
                        elevation={2}
                        style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 10,
                            padding: "8px 12px",
                            display: "grid",
                            gap: "8px",
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" style={{ borderBottom: "1px solid #f0f0f0", padding: "6px 0" }}>
                            <Tooltip title={t("dashboard.previousWeek")}>
                                <span>
                                    <IconButton onClick={() => navigatePeriod(-1)} disabled={loading}>
                                        <ChevronLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <div style={{ minWidth: "220px", textAlign: "center" }}>
                                <div style={{ fontSize: "17px", fontWeight: 700, lineHeight: 1.3 }}>{activePeriodTitle}</div>
                                <div style={{ color: "#666", fontSize: "12px" }}>
                                    {formatDisplayDate(activeDateRange.date_from, t)} - {formatDisplayDate(activeDateRange.date_to, t)}
                                </div>
                            </div>
                            <Tooltip title={t("dashboard.nextWeek")}>
                                <span>
                                    <IconButton onClick={() => navigatePeriod(1)} disabled={loading}>
                                        <ChevronRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                            <TextField
                                select
                                label={t("common.site")}
                                size="small"
                                value={filters.site}
                                onChange={handleSiteChange}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">{t("dashboard.allSites")}</MenuItem>
                                {sites.map((site) => (
                                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label={t("common.studio")}
                                size="small"
                                value={filters.studio}
                                onChange={handleStudioChange}
                                style={{ minWidth: "220px" }}
                            >
                                <MenuItem value="">{t("dashboard.allStudios")}</MenuItem>
                                {visibleStudios.map((studio) => (
                                    <MenuItem key={studio.id} value={studio.id}>{studio.name}</MenuItem>
                                ))}
                            </TextField>
                            <Button variant="outlined" onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}>
                                {advancedFiltersOpen ? t("common.hideAdvanced") : t("common.advanced")}
                            </Button>
                        </Stack>
                        {advancedFiltersOpen && (
                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", borderTop: "1px solid #f0f0f0", paddingTop: "8px" }}>
                                <TextField
                                    select
                                    label={t("common.period")}
                                    value={periodMode}
                                    onChange={(event) => setPeriodMode(event.target.value)}
                                >
                                    <MenuItem value="current_week">{t("dashboard.period.currentWeek")}</MenuItem>
                                    <MenuItem value="previous_week">{t("dashboard.period.previousWeek")}</MenuItem>
                                    <MenuItem value="specific_week">{t("dashboard.period.specificWeek")}</MenuItem>
                                    <MenuItem value="range">{t("dashboard.period.customRange")}</MenuItem>
                                </TextField>
                                {periodMode === "specific_week" && (
                                    <TextField
                                        label={t("common.weekOf")}
                                        type="date"
                                        value={filters.week_date}
                                        InputLabelProps={{ shrink: true }}
                                        onChange={(event) => setFilters({ ...filters, week_date: event.target.value })}
                                    />
                                )}
                                {periodMode === "range" && (
                                    <>
                                        <TextField
                                            label={t("common.dateFrom")}
                                            type="date"
                                            value={filters.date_from}
                                            InputLabelProps={{ shrink: true }}
                                            onChange={(event) => setFilters({ ...filters, date_from: event.target.value })}
                                        />
                                        <TextField
                                            label={t("common.dateTo")}
                                            type="date"
                                            value={filters.date_to}
                                            InputLabelProps={{ shrink: true }}
                                            onChange={(event) => setFilters({ ...filters, date_to: event.target.value })}
                                        />
                                    </>
                                )}
                                <Button variant="contained" onClick={fetchReport} disabled={loading}>
                                    {loading ? t("common.loading") : t("common.apply")}
                                </Button>
                            </div>
                        )}
                        {loading && <LinearProgress />}
                    </Paper>

                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                        <div style={{ display: "grid", gap: "4px" }}>
                            <Typography variant="h5" fontWeight={800}>
                                {t("weeklyReport.title")}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {reportScope} | {formatDisplayDate(report?.trend_date_range?.from, t)} - {formatDisplayDate(report?.trend_date_range?.to, t)}
                            </Typography>
                        </div>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={downloadReportImage}
                            disabled={!report || loading || exportingImage}
                        >
                            {exportingImage ? t("weeklyReport.exportingImage") : t("weeklyReport.downloadImage")}
                        </Button>
                    </Stack>

                    <div
                        ref={reportExportRef}
                        style={{
                            display: "grid",
                            gap: "16px",
                            background: "#ffffff",
                            padding: "16px",
                            boxSizing: "border-box",
                            width: exportingImage ? `${EXPORT_IMAGE_WIDTH}px` : "100%",
                            height: "auto",
                            overflow: "visible",
                            gridTemplateRows: exportingImage ? "auto auto auto" : undefined,
                        }}
                    >
                        <div
                            style={{
                                display: exportingImage ? "grid" : "none",
                                justifyItems: "center",
                                gap: "6px",
                                textAlign: "center",
                                padding: "8px 0 4px",
                            }}
                        >
                                <img
                                    src={benessLogo.src}
                                    alt="Beness"
                                    style={{ width: 132, height: "auto", display: "block" }}
                                />
                                <Typography variant="h5" fontWeight={900} style={{ lineHeight: 1.15 }}>
                                    {reportScope}
                                </Typography>
                                <Typography variant="h6" fontWeight={800} style={{ lineHeight: 1.2 }}>
                                    {t("weeklyReport.title")}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" fontWeight={700}>
                                    {reportWeekLabel}
                                </Typography>
                        </div>

                        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                            <Paper style={{ padding: "16px" }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={700}>{t("weeklyReport.metrics.attendedTrials")}</Typography>
                                <Typography variant="h4" fontWeight={800}>{formatNumber(currentWeek.attended_trials)}</Typography>
                            </Paper>
                            <Paper style={{ padding: "16px" }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={700}>{t("weeklyReport.metrics.convertedMembers")}</Typography>
                                <Typography variant="h4" fontWeight={800}>{formatNumber(currentWeek.converted_members)}</Typography>
                            </Paper>
                            <Paper style={{ padding: "16px" }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={700}>{t("weeklyReport.metrics.assistances")}</Typography>
                                <Typography variant="h4" fontWeight={800}>{formatNumber(currentWeek.attendance_used)}</Typography>
                            </Paper>
                            <Paper style={{ padding: "16px" }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={700}>{t("weeklyReport.metrics.effectiveClasses")}</Typography>
                                <Typography variant="h4" fontWeight={800}>{formatNumber(currentWeek.effective_classes)}</Typography>
                            </Paper>
                            <Paper style={{ padding: "16px" }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={700}>{t("common.occupancy")}</Typography>
                                <Typography variant="h4" fontWeight={800}>{formatPercent(currentWeek.occupation_rate)}</Typography>
                            </Paper>
                        </div>

                        {exportingImage ? (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: `minmax(0, 1fr) ${EXPORT_TABLE_WIDTH}px`,
                                    gap: "14px",
                                    minHeight: 0,
                                    height: EXPORT_CHART_GRID_HEIGHT,
                                    flex: 1,
                                    alignItems: "stretch",
                                }}
                            >
                                <div
                                    style={{
                                        display: "grid",
                                        gap: EXPORT_CHART_GRID_GAP,
                                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                        gridTemplateRows: `repeat(3, ${EXPORT_CHART_PANEL_HEIGHT}px)`,
                                        minHeight: 0,
                                        height: EXPORT_CHART_GRID_HEIGHT,
                                    }}
                                >
                                    <OccupancyChart rows={weekRows} t={t} animate={chartAnimationActive} exportMode />
                                    <AssistancesChart rows={weekRows} t={t} animate={chartAnimationActive} exportMode />
                                    <AssistancesByHourChart rows={assistancesByHourRows} t={t} animate={chartAnimationActive} exportMode />
                                    <EffectiveClassesChart rows={weekRows} t={t} animate={chartAnimationActive} exportMode />
                                    <TrialClassesChart rows={weekRows} t={t} animate={chartAnimationActive} exportMode />
                                    <ConversionChart rows={weekRows} t={t} animate={chartAnimationActive} exportMode />
                                </div>
                                <StaffTable rows={report?.staff} weeks={weekRows} t={t} exportMode />
                            </div>
                        ) : (
                            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))" }}>
                                <OccupancyChart rows={weekRows} t={t} animate={chartAnimationActive} />
                                <AssistancesChart rows={weekRows} t={t} animate={chartAnimationActive} />
                                <AssistancesByHourChart rows={assistancesByHourRows} t={t} animate={chartAnimationActive} />
                                <EffectiveClassesChart rows={weekRows} t={t} animate={chartAnimationActive} />
                                <TrialClassesChart rows={weekRows} t={t} animate={chartAnimationActive} />
                                <ConversionChart rows={weekRows} t={t} animate={chartAnimationActive} />
                                <StaffTable rows={report?.staff} weeks={weekRows} t={t} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainPage>
    );
}

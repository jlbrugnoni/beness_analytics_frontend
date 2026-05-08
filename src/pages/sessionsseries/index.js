import MainPage from "@/pages/mainPage";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import {
    TextField, Button, Box, Alert, IconButton, CircularProgress, Backdrop, Typography, Card, CardContent, Chip, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import SessionsByRoomView from "@/components/SessionsByRoomView";
import useFetchToken from "@/components/useFetchUserId";
import Head from "next/head";
import usePermissions from "@/hooks/usePermissions";
import styles from "@/styles/FilterTablePage.module.css";
import AddSessionDialog from "@/components/AddOrEditSessionDialog";
import AddSessionSeriesDialog from "@/components/AddSessionSeriesDialog";
import RoutineSummaryDialog from "@/components/RoutineSummaryDialog";
import FeedbackDialog from "@/components/FeedBackDialog";
import SessionLogsDialog from "@/components/SessionLogsDialog";
import DeleteSessionDialog from "@/components/DeleteSessionDialog";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import Tooltip from "@mui/material/Tooltip";
import DailyRoutineAssignmentDialog from "@/components/DailyRoutineAssignmentDialog";
import GeneralRoutineAssignmentDialog from "@/components/GeneralRoutineAssignmentDialog";

export default function SessionSeriesTable() {
    const theme = useTheme();
    const isTabletDown = useMediaQuery(theme.breakpoints.down("lg"));
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const router = useRouter();
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const allowPastDailyAssignments = process.env.NEXT_PUBLIC_ALLOW_PAST_DAILY_ASSIGNMENTS === "true";
    const permissions = usePermissions();
    const userId = typeof window !== "undefined" ? sessionStorage.getItem("id") : null;
    
    // Estado para centro seleccionado
    const [selectedCenter, setSelectedCenter] = useState("");
    const [viewMode, setViewMode] = useState("global");
    
    // Filtro de fecha única
    const [selectedDate, setSelectedDate] = useState("");
    const [plannerWeekStart, setPlannerWeekStart] = useState("");
    const [weekSummary, setWeekSummary] = useState([]);
    const [loadingWeekSummary, setLoadingWeekSummary] = useState(false);
    const [globalWeekSummary, setGlobalWeekSummary] = useState([]);
    const [loadingGlobalWeekSummary, setLoadingGlobalWeekSummary] = useState(false);
    const [globalCalendarView, setGlobalCalendarView] = useState("week");
    const [globalMonthAnchor, setGlobalMonthAnchor] = useState("");
    const [dailyAssignments, setDailyAssignments] = useState([]);
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const [assignmentInitialRoomIds, setAssignmentInitialRoomIds] = useState([]);
    const [assignmentDefaultMode, setAssignmentDefaultMode] = useState("all");
    const [assignmentResult, setAssignmentResult] = useState(null);
    const [generalAssignmentDialogOpen, setGeneralAssignmentDialogOpen] = useState(false);
    const [generalAssignmentResult, setGeneralAssignmentResult] = useState(null);
    const [assignmentNotice, setAssignmentNotice] = useState(null);
    const [pendingAssignmentDelete, setPendingAssignmentDelete] = useState(null);

    const [sessions, setSessions] = useState([]);
    const [options, setOptions] = useState({ centers: [], rooms: [], routines: [], users: [] });
    const [allRoutines, setAllRoutines] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    
    // Modales
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [seriesModalOpen, setSeriesModalOpen] = useState(false);
    
    // Datos de sesión
    const [sessionData, setSessionData] = useState({
        name: "",
        room_id: "",
        scheduled_at: "",
        routine_id: null,
        duration: 60
    });
    const [editingSessionId, setEditingSessionId] = useState(null);

    // Filtros de rutinas
    const [routineFilters, setRoutineFilters] = useState({
        position__name__in: [],
        prop__name__in: [],
        machine__name__in: [],
        tag__id__in: [],
        group__in: [],
        box__in: []
    });
    const [routinesToShow, setRoutinesToShow] = useState([]);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [selectedRoutineId, setSelectedRoutineId] = useState(null);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [logsOpen, setLogsOpen] = useState(false);
    const [selectedSessionForLogs, setSelectedSessionForLogs] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [selectedGeneralNotes, setSelectedGeneralNotes] = useState(null);

    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        const today = new Date();
        const formattedDate = formatDateToInput(today);
        setSelectedDate((current) => current || formattedDate);
        setPlannerWeekStart((current) => current || getStartOfWeek(today));
        setGlobalMonthAnchor((current) => current || formatDateToInput(getStartOfMonth(today)));
    }, []);
    
    useEffect(() => {
        if (permissions !== null && selectedCenter && selectedDate && viewMode === "day") {
            fetchSessions();
        }
    }, [selectedDate, permissions, selectedCenter, viewMode, options.rooms]);

    useEffect(() => {
        if (permissions !== null && selectedCenter && plannerWeekStart && (viewMode === "planner" || viewMode === "day")) {
            fetchWeekSummary();
        }
    }, [permissions, selectedCenter, plannerWeekStart, options.rooms, viewMode]);

    useEffect(() => {
        if (permissions !== null && selectedCenter && selectedDate && (viewMode === "planner" || viewMode === "day")) {
            fetchDailyAssignments();
        }
    }, [permissions, selectedCenter, selectedDate, viewMode]);

    useEffect(() => {
        if (permissions !== null && plannerWeekStart) {
            fetchGlobalWeekSummary();
        }
    }, [permissions, plannerWeekStart, options.rooms, globalCalendarView]);

    useEffect(() => {
        fetchFilteredRoutines();
    }, [routineFilters]);

    const fetchOptions = async () => {
        try {
            const [
                centersRes,
                usersRes,
                positionsRes,
                propsRes,
                machinesRes,
                tagsRes,
                routinesRes
            ] = await Promise.all([
                axios.get(`${backendUrl}/api/data/all_centers_and_rooms/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_users/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_positions/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_props/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_machines/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_tags/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/routines_basic/`, {
                    headers: { Authorization: `Token ${token}` },
                    params: { on_edit: false, page: 1, page_size: 1000 }
                }),
            ]);

            setOptions({
                centers: centersRes.data || [],
                rooms: centersRes.data.flatMap(c => c.rooms || []),
                users: usersRes.data || [],
                positions: positionsRes.data || [],
                props: propsRes.data || [],
                machines: machinesRes.data || [],
                tags: tagsRes.data || [],
                group__in: ["Piernas", "Tronco", "Brazos"],
                box__in: ["No", "Larga", "Corta"]
            });
            setAllRoutines(routinesRes.data.results || []);
        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    const fetchSessions = async () => {
        setLoadingSessions(true);
        try {
            // Obtener las salas del centro seleccionado
            const centerRooms = options.rooms.filter(r => r.center === selectedCenter);
            const roomIds = centerRooms.map(r => r.id);

            if (roomIds.length === 0) {
                setSessions([]);
                setLoadingSessions(false);
                return;
            }

            // Convertir la fecha seleccionada a rango de inicio y fin del día
            const dateStart = parseInputDate(selectedDate);
            const dateEnd = parseInputDate(selectedDate, true);

            // UNA SOLA LLAMADA para todas las salas del centro
            const response = await axios.get(`${backendUrl}/api/data/routinesessions/`, {
                headers: { Authorization: `Token ${token}` },
                params: { 
                    room_id__in: roomIds.join(','), // Filtrar por múltiples salas
                    scheduled_at__gte: formatDateToLocalDatetimeInput(dateStart),
                    scheduled_at__lte: formatDateToLocalDatetimeInput(dateEnd),
                    page: 1,
                    page_size: 1000
                }
            });
            
            const allSessions = response.data.results || [];
            
            setSessions(allSessions);
            setTotalCount(allSessions.length);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            setSessions([]);
        } finally {
            setLoadingSessions(false);
        }
    };

    const fetchWeekSummary = async () => {
        setLoadingWeekSummary(true);
        try {
            const response = await axios.get(`${backendUrl}/api/data/daily-routine-assignments/week-summary/`, {
                headers: { Authorization: `Token ${token}` },
                params: {
                    center_id: selectedCenter,
                    start_date: plannerWeekStart,
                }
            });
            setWeekSummary(response.data.days || []);
        } catch (error) {
            console.error("Error fetching weekly summary:", error);
            setWeekSummary([]);
        } finally {
            setLoadingWeekSummary(false);
        }
    };

    const fetchGlobalWeekSummary = async () => {
        setLoadingGlobalWeekSummary(true);
        try {
            let weekStarts = [];

            if (globalCalendarView === "month") {
                const monthStart = parseInputDate(globalMonthAnchor || formatDateToInput(getStartOfMonth(new Date())));
                const monthEnd = getEndOfMonth(monthStart);
                const calendarStart = parseInputDate(getStartOfWeek(monthStart));
                const calendarEnd = getEndOfWeek(monthEnd);
                const cursor = new Date(calendarStart);

                while (cursor <= calendarEnd) {
                    weekStarts.push(formatDateToInput(cursor));
                    cursor.setDate(cursor.getDate() + 7);
                }
            } else {
                weekStarts = [plannerWeekStart];
            }

            const responses = await Promise.all(
                weekStarts.map((startDate) =>
                    axios.get(`${backendUrl}/api/data/general-routine-assignments/week-summary/`, {
                        headers: { Authorization: `Token ${token}` },
                        params: { start_date: startDate },
                    })
                )
            );

            const combinedDays = responses
                .flatMap((response) => response.data.days || [])
                .filter((day, index, array) => array.findIndex((candidate) => candidate.date === day.date) === index)
                .sort((a, b) => a.date.localeCompare(b.date));

            setGlobalWeekSummary(combinedDays);
        } catch (error) {
            console.error("Error fetching global weekly summary:", error);
            setGlobalWeekSummary([]);
        } finally {
            setLoadingGlobalWeekSummary(false);
        }
    };

    const fetchDailyAssignments = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/daily-routine-assignments/`, {
                headers: { Authorization: `Token ${token}` },
                params: {
                    center_id: selectedCenter,
                    date: selectedDate,
                    active: true,
                }
            });
            setDailyAssignments(response.data.results || response.data || []);
        } catch (error) {
            console.error("Error fetching daily assignments:", error);
            setDailyAssignments([]);
        }
    };

    const fetchFilteredRoutines = async () => {
        try {
            const formattedFilters = {
                ...routineFilters,
                position__name__in: routineFilters.position__name__in.join(","),
                prop__name__in: routineFilters.prop__name__in.join(","),
                machine__name__in: routineFilters.machine__name__in.join(","),
                tag__id__in: routineFilters.tag__id__in.join(","),
                on_edit: false,
                page: 1,
                page_size: 50
            };

            const res = await axios.get(`${backendUrl}/api/data/routines_basic/`, {
                headers: { Authorization: `Token ${token}` },
                params: formattedFilters
            });

            setRoutinesToShow(res.data.results || []);
        } catch (error) {
            console.error("Error fetching filtered routines:", error);
        }
    };

    const getTodayDateString = () => {
        const now = new Date();
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return localNow.toISOString().split("T")[0];
    };

    const isPastPlannerDate = (dateValue) => {
        if (!dateValue) return false;
        return dateValue < getTodayDateString();
    };

    const canEditAssignmentsForDate = (dateValue) => allowPastDailyAssignments || !isPastPlannerDate(dateValue);

    const getAssignmentRestrictionMessage = (dateValue) => {
        if (canEditAssignmentsForDate(dateValue)) return "";
        return "No se pueden crear ni editar asignaciones diarias en fechas pasadas.";
    };

    const handleOpenCenterPlanner = (centerId) => {
        setSelectedCenter(centerId);
        setViewMode("planner");
        setAssignmentResult(null);
        setGeneralAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handleBackToGlobal = () => {
        setSelectedCenter("");
        setSessions([]);
        setDailyAssignments([]);
        setViewMode("global");
        setAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        setPlannerWeekStart(getStartOfWeek(parseInputDate(newDate)));
        setPage(0); // Resetear página al cambiar fecha
        setAssignmentResult(null);
        setGeneralAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handlePreviousDay = () => {
        if (selectedDate) {
            const currentDate = parseInputDate(selectedDate);
            currentDate.setDate(currentDate.getDate() - 1);
            setSelectedDate(formatDateToInput(currentDate));
            setPlannerWeekStart(getStartOfWeek(currentDate));
            setPage(0);
            setAssignmentResult(null);
            setGeneralAssignmentResult(null);
            setAssignmentNotice(null);
        }
    };

    const handleNextDay = () => {
        if (selectedDate) {
            const currentDate = parseInputDate(selectedDate);
            currentDate.setDate(currentDate.getDate() + 1);
            setSelectedDate(formatDateToInput(currentDate));
            setPlannerWeekStart(getStartOfWeek(currentDate));
            setPage(0);
            setAssignmentResult(null);
            setGeneralAssignmentResult(null);
            setAssignmentNotice(null);
        }
    };

    const handlePlannerPreviousWeek = () => {
        const baseDate = parseInputDate(plannerWeekStart || selectedDate);
        if (viewMode === "global" && globalCalendarView === "month") {
            const monthAnchor = parseInputDate(globalMonthAnchor || formatDateToInput(getStartOfMonth(baseDate)));
            const previousMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1);
            setGlobalMonthAnchor(formatDateToInput(previousMonth));
            setPlannerWeekStart(getStartOfWeek(previousMonth));
        } else {
            baseDate.setDate(baseDate.getDate() - 7);
            setPlannerWeekStart(getStartOfWeek(baseDate));
        }
        setAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handlePlannerNextWeek = () => {
        const baseDate = parseInputDate(plannerWeekStart || selectedDate);
        if (viewMode === "global" && globalCalendarView === "month") {
            const monthAnchor = parseInputDate(globalMonthAnchor || formatDateToInput(getStartOfMonth(baseDate)));
            const nextMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
            setGlobalMonthAnchor(formatDateToInput(nextMonth));
            setPlannerWeekStart(getStartOfWeek(nextMonth));
        } else {
            baseDate.setDate(baseDate.getDate() + 7);
            setPlannerWeekStart(getStartOfWeek(baseDate));
        }
        setAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handlePlannerGoToToday = () => {
        const today = new Date();
        const todayString = formatDateToInput(today);
        setSelectedDate(todayString);
        setGlobalMonthAnchor(formatDateToInput(getStartOfMonth(today)));
        setPlannerWeekStart(getStartOfWeek(globalCalendarView === "month" ? getStartOfMonth(today) : today));
        setAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handleOpenDayView = (day) => {
        setSelectedDate(day.date);
        setPlannerWeekStart(getStartOfWeek(parseInputDate(day.date)));
        setViewMode("day");
        setAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handleOpenGeneralNotes = (day) => {
        setSelectedGeneralNotes(day);
        setNotesDialogOpen(true);
    };

    const handleBackToPlanner = () => {
        setViewMode("planner");
        setAssignmentResult(null);
        setAssignmentNotice(null);
    };

    const handlePageChange = (event, newPage) => setPage(newPage);
    
    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleCreateSession = async (applyToSeries = false) => {
        setLoading(true);
        try {
            const { center_id, session_series_id, session_series_name, ...payload } = sessionData;
            
            if (editingSessionId) {
                // Primero, siempre actualizar la sesión ACTUAL con TODOS los cambios
                await axios.put(
                    `${backendUrl}/api/data/routinesessions/${editingSessionId}/`,
                    payload,
                    { headers: { Authorization: `Token ${token}` } }
                );
                
                // Si es edición y se debe aplicar a las sesiones futuras de la serie
                if (applyToSeries && sessionData.session_series_id) {
                    // Extraer solo la hora del scheduled_at para enviar al endpoint de serie
                    const scheduledDateTime = new Date(payload.scheduled_at);
                    const timeString = `${scheduledDateTime.getHours().toString().padStart(2, '0')}:${scheduledDateTime.getMinutes().toString().padStart(2, '0')}`;
                    
                    // Payload para sesiones futuras: TODO excepto routine_id
                    const seriesPayload = {
                        name: payload.name,
                        duration: payload.duration,
                        room_id: payload.room_id,
                        user_id: payload.user_id,
                        time: timeString
                        // NO incluir routine_id - solo se aplica a la sesión actual
                    };
                    
                    // Usar el endpoint especial para actualizar sesiones futuras de la serie
                    await axios.patch(
                        `${backendUrl}/api/data/routinesessions/${editingSessionId}/update-series/`,
                        seriesPayload,
                        { headers: { Authorization: `Token ${token}` } }
                    );
                }
            } else {
                // Creación normal
                await axios.post(
                    `${backendUrl}/api/data/routinesessions/`,
                    payload,
                    { headers: { Authorization: `Token ${token}` } }
                );
            }
            setSessionModalOpen(false);
            setEditingSessionId(null);
            await fetchSessions();
        } catch (error) {
            console.error("Error al crear/editar la sesión:", error);
            alert("Error al guardar la sesión.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSeries = async (seriesData) => {
        setLoading(true);
        try {
            await axios.post(`${backendUrl}/api/data/sessionseries/`, seriesData, {
                headers: { Authorization: `Token ${token}` },
            });
            setSeriesModalOpen(false);
            await fetchSessions();
        } catch (error) {
            console.error("Error al crear la serie:", error);
            alert("Error al crear la serie.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFeedback = (session) => {
        setSelectedSession(session);
        setFeedbackOpen(true);
    };

    const handleOpenLogs = (session) => {
        setSelectedSessionForLogs(session);
        setLogsOpen(true);
    };

    const handleSaveFeedback = async (feedback) => {
        try {
            await axios.patch(`${backendUrl}/api/data/routinesessions/${selectedSession.id}/`, {
                userFeedback: feedback
            }, {
                headers: { Authorization: `Token ${token}` },
            });
            fetchSessions();
        } catch (error) {
            console.error("Error al guardar el feedback:", error);
            alert("Error al guardar el feedback.");
        }
    };

    function formatDateToLocalDatetimeInput(date) {
        const pad = (n) => n.toString().padStart(2, '0');
        const yyyy = date.getFullYear();
        const MM = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    }

    function parseInputDate(dateString, endOfDay = false) {
        const [year, month, day] = dateString.split("-").map(Number);
        return endOfDay
            ? new Date(year, month - 1, day, 23, 59, 59)
            : new Date(year, month - 1, day);
    }

    function formatDateToInput(date) {
        const pad = (n) => n.toString().padStart(2, '0');
        const yyyy = date.getFullYear();
        const MM = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        return `${yyyy}-${MM}-${dd}`;
    }

    function getStartOfWeek(date) {
        const baseDate = new Date(date);
        const day = baseDate.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        baseDate.setDate(baseDate.getDate() + diff);
        return formatDateToInput(baseDate);
    }

    function getEndOfWeek(date) {
        const baseDate = parseInputDate(getStartOfWeek(date));
        baseDate.setDate(baseDate.getDate() + 6);
        return baseDate;
    }

    function getStartOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function getEndOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    function formatReadableDate(dateString) {
        const date = parseInputDate(dateString);
        return date.toLocaleDateString("es-DO", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });
    }

    function formatMonthLabel(date) {
        return date.toLocaleDateString("es-DO", {
            month: "long",
            year: "numeric",
        });
    }

    const weekdayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

    const handleGlobalCalendarViewChange = (nextView) => {
        if (nextView === globalCalendarView) return;
        setGlobalCalendarView(nextView);

        if (nextView === "month") {
            const monthStart = getStartOfMonth(parseInputDate(selectedDate || plannerWeekStart));
            setGlobalMonthAnchor(formatDateToInput(monthStart));
            setPlannerWeekStart(getStartOfWeek(monthStart));
        }
    };

    const renderGeneralPlanningView = () => {
        const monthAnchor = parseInputDate(globalMonthAnchor || formatDateToInput(getStartOfMonth(parseInputDate(selectedDate || plannerWeekStart))));
        const currentMonth = monthAnchor.getMonth();
        const calendarWeeks = Array.from({ length: Math.ceil(globalWeekSummary.length / 7) }, (_, weekIndex) =>
            globalWeekSummary.slice(weekIndex * 7, (weekIndex + 1) * 7)
        ).filter((week) => week.length > 0);

        const renderGeneralWeekCards = () => (
            <Box
                display="grid"
                gridTemplateColumns={{
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(3, minmax(0, 1fr))",
                    lg: "repeat(4, minmax(0, 1fr))",
                }}
                gap={{ xs: 1.25, md: 1.5 }}
                mb={2.5}
            >
                {globalWeekSummary.map((day) => (
                    <Card
                        key={day.date}
                        sx={{
                            borderRadius: 3,
                            border: day.date === selectedDate ? "2px solid" : "1px solid",
                            borderColor: day.date === selectedDate ? "primary.main" : "divider",
                        }}
                    >
                        <CardContent sx={{ p: { xs: 1.25, md: 1.35 }, "&:last-child": { pb: { xs: 1.25, md: 1.35 } } }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                                <Typography variant="h6" sx={{ mb: 0.35, fontSize: { xs: "1rem", md: "1.05rem" } }}>
                                    {formatReadableDate(day.date)}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={0.75}>
                                    {day.notes && (
                                        <Tooltip title="Ver nota">
                                            <IconButton
                                                size={isMobile ? "medium" : "small"}
                                                color="info"
                                                onClick={() => handleOpenGeneralNotes(day)}
                                                sx={{
                                                    backgroundColor: "rgba(2, 136, 209, 0.10)",
                                                    border: "1px solid",
                                                    borderColor: "rgba(2, 136, 209, 0.25)",
                                                    width: isMobile ? 40 : 34,
                                                    height: isMobile ? 40 : 34,
                                                }}
                                            >
                                                <DescriptionOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {day.has_general_assignment && permissions.includes("core_data.add_routinesession") && (
                                        <Tooltip
                                            title={
                                                canEditAssignmentsForDate(day.date)
                                                    ? "Quitar asignación general"
                                                    : getAssignmentRestrictionMessage(day.date)
                                            }
                                        >
                                            <Box component="span">
                                                <IconButton
                                                    size={isMobile ? "medium" : "small"}
                                                    color="error"
                                                    onClick={() => handleRequestDeleteGeneralAssignment(day)}
                                                    disabled={!canEditAssignmentsForDate(day.date)}
                                                    sx={{
                                                        backgroundColor: "rgba(211, 47, 47, 0.10)",
                                                        border: "1px solid",
                                                        borderColor: "rgba(211, 47, 47, 0.22)",
                                                        width: isMobile ? 40 : 34,
                                                        height: isMobile ? 40 : 34,
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Tooltip>
                                    )}
                                    {permissions.includes("core_data.add_routinesession") && (
                                        <Tooltip
                                            title={
                                                canEditAssignmentsForDate(day.date)
                                                    ? (day.has_general_assignment ? "Editar asignación general" : "Asignar clase general")
                                                    : getAssignmentRestrictionMessage(day.date)
                                            }
                                        >
                                            <Box component="span">
                                                <IconButton
                                                    size={isMobile ? "medium" : "small"}
                                                    color={day.has_general_assignment ? "primary" : "success"}
                                                    onClick={() => handleOpenGeneralAssignmentDialog(day)}
                                                    disabled={!canEditAssignmentsForDate(day.date)}
                                                    sx={{
                                                        backgroundColor: day.has_general_assignment ? "rgba(25, 118, 210, 0.10)" : "rgba(46, 125, 50, 0.10)",
                                                        border: "1px solid",
                                                        borderColor: day.has_general_assignment ? "rgba(25, 118, 210, 0.25)" : "rgba(46, 125, 50, 0.25)",
                                                        width: isMobile ? 40 : 34,
                                                        height: isMobile ? 40 : 34,
                                                    }}
                                                >
                                                    {day.has_general_assignment ? <EditIcon fontSize="small" /> : <AddCircleOutlineIcon fontSize="small" />}
                                                </IconButton>
                                            </Box>
                                        </Tooltip>
                                    )}
                                </Box>
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.1, fontSize: "0.82rem" }}>
                                {day.sessions_count} sesiones en {day.centers_count} centros y {day.rooms_count} salas
                            </Typography>

                            <Box
                                sx={{
                                    mb: 1.1,
                                    p: 1,
                                    borderRadius: 2,
                                    backgroundColor: day.has_general_assignment ? "rgba(25, 118, 210, 0.08)" : "rgba(0, 0, 0, 0.03)",
                                    border: "1px solid",
                                    borderColor: day.has_general_assignment ? "rgba(25, 118, 210, 0.18)" : "rgba(0, 0, 0, 0.08)",
                                    minHeight: 70,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.35 }}>
                                    Clase general del día
                                </Typography>
                                {day.general_routine_name ? (
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: "0.98rem" }}>
                                        {day.general_routine_name}
                                    </Typography>
                                ) : (
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.secondary", lineHeight: 1.2, fontSize: "0.95rem" }}>
                                        Sin clase general asignada
                                    </Typography>
                                )}
                            </Box>

                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                {day.has_general_assignment && (
                                    <Chip
                                        label={
                                            day.assigned_rooms_count === day.rooms_count
                                                ? "Todas las salas cubiertas"
                                                : `${day.assigned_rooms_count} de ${day.rooms_count} salas cubiertas`
                                        }
                                        color="primary"
                                        size="small"
                                    />
                                )}
                                {day.has_room_overrides && (
                                    <Chip label={`${day.overridden_room_assignments_count} salas distintas`} color="warning" size="small" />
                                )}
                                {day.centers_with_room_overrides_count > 0 && (
                                    <Chip label={`${day.centers_with_room_overrides_count} centros con cambios`} color="warning" size="small" variant="outlined" />
                                )}
                                {day.overridden_sessions_count > 0 && (
                                    <Chip label={`${day.overridden_sessions_count} cambios manuales`} color="error" size="small" />
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>
        );

        const renderGeneralMonthCalendar = () => (
            <Box mb={2.5}>
                <Box
                    display="grid"
                    gridTemplateColumns="repeat(7, minmax(0, 1fr))"
                    gap={0}
                    mb={0}
                    alignItems="center"
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderBottom: "none",
                        borderRadius: "18px 18px 0 0",
                        overflow: "hidden",
                        backgroundColor: "rgba(0,0,0,0.015)",
                    }}
                >
                    {weekdayLabels.map((label) => (
                        <Typography
                            key={label}
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                color: "text.secondary",
                                textAlign: "center",
                                py: 1,
                                borderRight: label !== weekdayLabels[weekdayLabels.length - 1] ? "1px solid" : "none",
                                borderColor: "divider",
                            }}
                        >
                            {label}
                        </Typography>
                    ))}
                </Box>

                <Box
                    display="flex"
                    flexDirection="column"
                    sx={{
                        borderLeft: "1px solid",
                        borderRight: "1px solid",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        borderRadius: "0 0 18px 18px",
                        overflow: "hidden",
                    }}
                >
                    {calendarWeeks.map((week, weekIndex) => (
                        <Box
                            key={week[0]?.date || weekIndex}
                            display="grid"
                            gridTemplateColumns="repeat(7, minmax(0, 1fr))"
                            gap={0}
                        >
                            {week.map((day) => {
                                const isOutsideMonth = parseInputDate(day.date).getMonth() !== currentMonth;

                                return (
                                    <Box
                                        key={day.date}
                                        sx={{
                                            opacity: isOutsideMonth ? 0.62 : 1,
                                            minHeight: { xs: 138, md: 156 },
                                            backgroundColor: day.date === selectedDate
                                                ? "rgba(25, 118, 210, 0.06)"
                                                : isOutsideMonth
                                                    ? "rgba(0,0,0,0.015)"
                                                    : "background.paper",
                                            borderRight: "1px solid",
                                            borderBottom: weekIndex === calendarWeeks.length - 1 ? "none" : "1px solid",
                                            borderColor: "divider",
                                            position: "relative",
                                            "&:last-of-type": {
                                                borderRight: "none",
                                            },
                                        }}
                                    >
                                        {day.date === selectedDate && (
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    border: "2px solid",
                                                    borderColor: "primary.main",
                                                    pointerEvents: "none",
                                                }}
                                            />
                                        )}
                                        <Box sx={{ p: { xs: 0.75, md: 0.85 } }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={0.5} mb={0.5}>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                                                        {parseInputDate(day.date).getDate()}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.1 }}>
                                                        {day.sessions_count} sesiones
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" alignItems="center" gap={0.35}>
                                                    {day.notes && (
                                                        <Tooltip title="Ver nota">
                                                            <IconButton
                                                                size="small"
                                                                color="info"
                                                                onClick={() => handleOpenGeneralNotes(day)}
                                                                sx={{
                                                                    backgroundColor: "rgba(2, 136, 209, 0.10)",
                                                                    width: 26,
                                                                    height: 26,
                                                                }}
                                                            >
                                                                <DescriptionOutlinedIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {day.has_general_assignment && permissions.includes("core_data.add_routinesession") && (
                                                        <Tooltip
                                                            title={
                                                                canEditAssignmentsForDate(day.date)
                                                                    ? "Quitar asignación general"
                                                                    : getAssignmentRestrictionMessage(day.date)
                                                            }
                                                        >
                                                            <Box component="span">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleRequestDeleteGeneralAssignment(day)}
                                                                    disabled={!canEditAssignmentsForDate(day.date)}
                                                                    sx={{
                                                                        backgroundColor: "rgba(211, 47, 47, 0.10)",
                                                                        width: 26,
                                                                        height: 26,
                                                                    }}
                                                                >
                                                                    <DeleteIcon sx={{ fontSize: 15 }} />
                                                                </IconButton>
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                    {permissions.includes("core_data.add_routinesession") && (
                                                        <Tooltip
                                                            title={
                                                                canEditAssignmentsForDate(day.date)
                                                                    ? (day.has_general_assignment ? "Editar asignación general" : "Asignar clase general")
                                                                    : getAssignmentRestrictionMessage(day.date)
                                                            }
                                                        >
                                                            <Box component="span">
                                                                <IconButton
                                                                    size="small"
                                                                    color={day.has_general_assignment ? "primary" : "success"}
                                                                    onClick={() => handleOpenGeneralAssignmentDialog(day)}
                                                                    disabled={!canEditAssignmentsForDate(day.date)}
                                                                    sx={{
                                                                        backgroundColor: day.has_general_assignment ? "rgba(25, 118, 210, 0.10)" : "rgba(46, 125, 50, 0.10)",
                                                                        width: 26,
                                                                        height: 26,
                                                                    }}
                                                                >
                                                                    {day.has_general_assignment ? <EditIcon sx={{ fontSize: 15 }} /> : <AddCircleOutlineIcon sx={{ fontSize: 15 }} />}
                                                                </IconButton>
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </Box>

                                            <Box
                                                sx={{
                                                    mb: 0.65,
                                                    py: 0.45,
                                                    minHeight: 44,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: day.general_routine_name ? 700 : 600,
                                                        lineHeight: 1.2,
                                                        color: day.general_routine_name ? "text.primary" : "text.secondary",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                        fontSize: "0.82rem",
                                                    }}
                                                >
                                                    {day.general_routine_name || "Sin clase asignada"}
                                                </Typography>
                                            </Box>

                                            <Box display="flex" flexWrap="wrap" gap={0.35}>
                                                {day.has_room_overrides && (
                                                    <Chip label={`${day.overridden_room_assignments_count} salas`} color="warning" size="small" />
                                                )}
                                                {day.overridden_sessions_count > 0 && (
                                                    <Chip label={`${day.overridden_sessions_count} manuales`} color="error" size="small" />
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            </Box>
        );

        return (
            <>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <IconButton onClick={handlePlannerPreviousWeek} color="primary">
                            <ChevronLeftIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontSize: { xs: "1rem", md: "1.1rem" } }}>
                            {globalCalendarView === "month"
                                ? formatMonthLabel(monthAnchor)
                                : `Semana de ${formatReadableDate(plannerWeekStart)}`}
                        </Typography>
                        <IconButton onClick={handlePlannerNextWeek} color="primary">
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                        <Box
                            sx={{
                                display: "inline-flex",
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                                overflow: "hidden",
                            }}
                        >
                            <Button
                                variant={globalCalendarView === "week" ? "contained" : "text"}
                                onClick={() => handleGlobalCalendarViewChange("week")}
                                sx={{ minWidth: 92, borderRadius: 0 }}
                            >
                                Semana
                            </Button>
                            <Button
                                variant={globalCalendarView === "month" ? "contained" : "text"}
                                onClick={() => handleGlobalCalendarViewChange("month")}
                                sx={{ minWidth: 92, borderRadius: 0 }}
                            >
                                Mes
                            </Button>
                        </Box>
                        <Button variant="outlined" onClick={handlePlannerGoToToday}>
                            Hoy
                        </Button>
                        {permissions.includes("core_data.add_routinesession") && (
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CalendarMonthIcon />}
                                onClick={() => handleOpenGeneralAssignmentDialog()}
                                disabled={!canEditAssignmentsForDate(selectedDate)}
                            >
                                + Asignar clase general
                            </Button>
                        )}
                    </Box>
                </Box>

                {generalAssignmentResult && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Se actualizaron {generalAssignmentResult.updated_sessions} sesión(es), {generalAssignmentResult.created_room_assignments} sala(s) se crearon y {generalAssignmentResult.updated_room_assignments} sala(s) se actualizaron.
                        {generalAssignmentResult.preserved_room_overrides > 0 && ` Se conservaron ${generalAssignmentResult.preserved_room_overrides} sala(s) con clase distinta.`}
                        {generalAssignmentResult.skipped_overridden_sessions > 0 && ` Se conservaron ${generalAssignmentResult.skipped_overridden_sessions} sesión(es) con cambio manual.`}
                        {generalAssignmentResult.skipped_non_programmed_sessions > 0 && ` Se omitieron ${generalAssignmentResult.skipped_non_programmed_sessions} sesión(es) que ya no estaban en estado Programada.`}
                        {generalAssignmentResult.skipped_past_sessions > 0 && ` Se omitieron ${generalAssignmentResult.skipped_past_sessions} sesión(es) por pertenecer a una fecha pasada.`}
                    </Alert>
                )}

                {loadingGlobalWeekSummary ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress size={40} />
                    </Box>
                ) : (
                    globalCalendarView === "month" ? renderGeneralMonthCalendar() : renderGeneralWeekCards()
                )}

                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1.5}>
                    <Typography variant="h6">Centros</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Elige un centro para revisar la semana y bajar al detalle operativo.
                    </Typography>
                </Box>

                <Box
                    display="grid"
                    gridTemplateColumns={{
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        lg: "repeat(3, minmax(0, 1fr))",
                    }}
                    gap={{ xs: 1.25, md: 1.5 }}
                >
                    {options.centers.map((center) => (
                        <Card key={center.id} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                            <CardContent sx={{ p: { xs: 1.25, md: 1.35 }, "&:last-child": { pb: { xs: 1.25, md: 1.35 } } }}>
                                <Typography variant="h6" sx={{ mb: 0.35, fontSize: { xs: "1rem", md: "1.05rem" } }}>
                                    {center.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.1, fontSize: "0.82rem" }}>
                                    {(center.rooms || []).length} sala(s)
                                </Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                    <Button variant="contained" onClick={() => handleOpenCenterPlanner(center.id)}>
                                        Ver semana
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            handleOpenCenterPlanner(center.id);
                                            const today = new Date();
                                            setSelectedDate(getTodayDateString());
                                            setPlannerWeekStart(getStartOfWeek(today));
                                            setViewMode("day");
                                        }}
                                    >
                                        Ir a hoy
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </>
        );
    };

    const renderPlannerView = (selectedCenterRooms) => {
        return (
            <>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <IconButton onClick={handlePlannerPreviousWeek} color="primary">
                            <ChevronLeftIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontSize: { xs: "1rem", md: "1.1rem" } }}>
                            Semana de {formatReadableDate(plannerWeekStart)}
                        </Typography>
                        <IconButton onClick={handlePlannerNextWeek} color="primary">
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                        <Button variant="outlined" onClick={handlePlannerGoToToday}>
                            Hoy
                        </Button>
                    </Box>
                </Box>

                {assignmentResult && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Se actualizaron {assignmentResult.updated_sessions} sesión(es) en {assignmentResult.created_assignments + assignmentResult.updated_assignments} asignación(es).
                        {assignmentResult.skipped_overridden_sessions > 0 && ` Se conservaron ${assignmentResult.skipped_overridden_sessions} sesión(es) con cambio manual.`}
                        {assignmentResult.skipped_non_programmed_sessions > 0 && ` Se omitieron ${assignmentResult.skipped_non_programmed_sessions} sesión(es) que ya no estaban en estado Programada.`}
                        {assignmentResult.skipped_past_sessions > 0 && ` Se omitieron ${assignmentResult.skipped_past_sessions} sesión(es) por pertenecer a una fecha pasada.`}
                    </Alert>
                )}

                {loadingWeekSummary ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress size={40} />
                    </Box>
                ) : (
                    <Box
                        display="grid"
                        gridTemplateColumns={{
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                            md: "repeat(3, minmax(0, 1fr))",
                            lg: "repeat(4, minmax(0, 1fr))",
                        }}
                        gap={{ xs: 1.25, md: 1.5 }}
                    >
                        {weekSummary.map((day) => (
                            <Card
                                key={day.date}
                                sx={{
                                    borderRadius: 3,
                                    border: day.date === selectedDate ? "2px solid" : "1px solid",
                                    borderColor: day.date === selectedDate ? "primary.main" : "divider",
                                    cursor: "pointer",
                                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                    "&:hover": {
                                        transform: "translateY(-2px)",
                                        boxShadow: 4,
                                    },
                                }}
                                onClick={() => handleOpenDayView(day)}
                            >
                                <CardContent sx={{ p: { xs: 1.25, md: 1.35 }, "&:last-child": { pb: { xs: 1.25, md: 1.35 } } }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                                        <Typography variant="h6" sx={{ mb: 0.35, fontSize: { xs: "1rem", md: "1.05rem" } }}>
                                            {formatReadableDate(day.date)}
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={0.75}>
                                            {day.has_assignments && permissions.includes("core_data.add_routinesession") && (
                                                <Tooltip
                                                    title={
                                                        canEditAssignmentsForDate(day.date)
                                                            ? "Quitar asignación"
                                                            : getAssignmentRestrictionMessage(day.date)
                                                    }
                                                >
                                                    <Box component="span">
                                                        <IconButton
                                                            size={isMobile ? "medium" : "small"}
                                                            color="error"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleRequestClearPlannerDay(day);
                                                            }}
                                                            disabled={!canEditAssignmentsForDate(day.date)}
                                                            sx={{
                                                                backgroundColor: "rgba(211, 47, 47, 0.10)",
                                                                border: "1px solid",
                                                                borderColor: "rgba(211, 47, 47, 0.22)",
                                                                width: isMobile ? 40 : 34,
                                                                height: isMobile ? 40 : 34,
                                                                "&:hover": {
                                                                    backgroundColor: "rgba(211, 47, 47, 0.16)",
                                                                },
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Tooltip>
                                            )}
                                            {permissions.includes("core_data.add_routinesession") && (
                                                <Tooltip
                                                    title={
                                                        canEditAssignmentsForDate(day.date)
                                                            ? (day.has_assignments ? "Editar asignación" : "Asignar clase")
                                                            : getAssignmentRestrictionMessage(day.date)
                                                    }
                                                >
                                                    <Box component="span">
                                                        <IconButton
                                                            size={isMobile ? "medium" : "small"}
                                                            color={day.has_assignments ? "primary" : "success"}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleOpenPlannerAssignmentDialog(day);
                                                            }}
                                                            disabled={!canEditAssignmentsForDate(day.date)}
                                                            sx={{
                                                                backgroundColor: day.has_assignments ? "rgba(25, 118, 210, 0.10)" : "rgba(46, 125, 50, 0.10)",
                                                                border: "1px solid",
                                                                borderColor: day.has_assignments ? "rgba(25, 118, 210, 0.25)" : "rgba(46, 125, 50, 0.25)",
                                                                width: isMobile ? 40 : 34,
                                                                height: isMobile ? 40 : 34,
                                                                "&:hover": {
                                                                    backgroundColor: day.has_assignments ? "rgba(25, 118, 210, 0.16)" : "rgba(46, 125, 50, 0.16)",
                                                                },
                                                            }}
                                                        >
                                                            {day.has_assignments ? <EditIcon fontSize="small" /> : <AddCircleOutlineIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.1, fontSize: "0.82rem" }}>
                                        {day.sessions_count} sesiones en {selectedCenterRooms.length} salas
                                    </Typography>

                                    <Box
                                        sx={{
                                            mb: 1.1,
                                            p: 1,
                                            borderRadius: 2,
                                            backgroundColor: day.has_assignments ? "rgba(25, 118, 210, 0.08)" : "rgba(0, 0, 0, 0.03)",
                                            border: "1px solid",
                                            borderColor: day.has_assignments ? "rgba(25, 118, 210, 0.18)" : "rgba(0, 0, 0, 0.08)",
                                            minHeight: 70,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.35 }}>
                                            Clase del día
                                        </Typography>
                                        {day.single_routine_name ? (
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: 700,
                                                    lineHeight: 1.2,
                                                    fontSize: "0.98rem",
                                                }}
                                            >
                                                {day.single_routine_name}
                                            </Typography>
                                        ) : day.has_mixed_assignments ? (
                                            <>
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{
                                                        fontWeight: 700,
                                                        lineHeight: 1.2,
                                                        fontSize: "0.98rem",
                                                    }}
                                                >
                                                    Asignación mixta
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                                                    {day.routine_count} clases distribuidas entre las salas
                                                </Typography>
                                            </>
                                        ) : (
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: "text.secondary",
                                                    lineHeight: 1.2,
                                                    fontSize: "0.95rem",
                                                }}
                                            >
                                                Sin clase asignada
                                            </Typography>
                                        )}
                                    </Box>

                                    {day.has_general_assignment && (
                                        <Box
                                            sx={{
                                                mb: 1.25,
                                                p: 1,
                                                borderRadius: 2,
                                                backgroundColor: day.follows_general_assignment
                                                    ? "rgba(46, 125, 50, 0.08)"
                                                    : "rgba(237, 108, 2, 0.08)",
                                                border: "1px solid",
                                                borderColor: day.follows_general_assignment
                                                    ? "rgba(46, 125, 50, 0.18)"
                                                    : "rgba(237, 108, 2, 0.18)",
                                            }}
                                        >
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.35, display: "block" }}>
                                                Asignación general
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 700,
                                                    lineHeight: 1.25,
                                                    color: day.follows_general_assignment ? "success.dark" : "warning.dark",
                                                }}
                                            >
                                                {day.general_routine_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {day.follows_general_assignment
                                                    ? "Este centro sigue la planificación general."
                                                    : "Este centro tiene diferencias respecto a la planificación general."}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box display="flex" flexWrap="wrap" gap={0.5} mb={1.1}>
                                        {day.has_assignments && (
                                            <Chip
                                                label={
                                                    day.assigned_rooms_count === selectedCenterRooms.length
                                                        ? "Todas las salas con clase"
                                                        : `${day.assigned_rooms_count} de ${selectedCenterRooms.length} salas con clase`
                                                }
                                                color="primary"
                                                size="small"
                                            />
                                        )}
                                        {day.has_mixed_assignments && (
                                            <Chip label={`${day.routine_count} clases`} color="warning" size="small" />
                                        )}
                                        {day.has_general_assignment && day.follows_general_assignment && (
                                            <Chip label="Sigue plan general" color="success" size="small" />
                                        )}
                                        {day.has_general_assignment && day.overriding_rooms_count > 0 && (
                                            <Chip label={`${day.overriding_rooms_count} salas distintas al plan general`} color="warning" size="small" />
                                        )}
                                        {!isMobile && <Chip label={`${day.sessions_count} sesiones`} variant="outlined" size="small" />}
                                        {day.overridden_sessions_count > 0 && (
                                            <Chip label={`${day.overridden_sessions_count} cambios manuales`} color="error" size="small" />
                                        )}
                                    </Box>

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">
                                            {day.has_assignments ? "Planificación disponible" : "Pendiente de asignación"}
                                        </Typography>
                                        <Button size="small" onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenDayView(day);
                                        }}>
                                            Ver día
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                )}
            </>
        );
    };

    const handleOpenSessionModal = () => {
        setEditingSessionId(null);
        setSessionData({
            name: "",
            center_id: selectedCenter,
            room_id: "",
            scheduled_at: "",
            routine_id: null,
            duration: 60
        });
        setRoutineFilters({
            position__name__in: [],
            prop__name__in: [],
            machine__name__in: [],
            tag__id__in: [],
            group__in: [],
            box__in: []
        });
        setSessionModalOpen(true);
    };

    const handleOpenSeriesModal = () => {
        setSeriesModalOpen(true);
    };

    const handleOpenAssignmentDialog = (roomIds = []) => {
        if (!canEditAssignmentsForDate(selectedDate)) {
            alert(getAssignmentRestrictionMessage(selectedDate));
            return;
        }
        setAssignmentInitialRoomIds(roomIds);
        setAssignmentDefaultMode(roomIds.length > 0 ? "rooms" : "all");
        setAssignmentDialogOpen(true);
    };

    const handleOpenPlannerAssignmentDialog = (day) => {
        if (!canEditAssignmentsForDate(day.date)) {
            alert(getAssignmentRestrictionMessage(day.date));
            return;
        }
        setSelectedDate(day.date);
        setPlannerWeekStart(getStartOfWeek(parseInputDate(day.date)));
        setAssignmentInitialRoomIds([]);
        setAssignmentDefaultMode("all");
        setAssignmentDialogOpen(true);
    };

    const handleOpenGeneralAssignmentDialog = (day = null) => {
        const targetDate = day?.date || selectedDate;
        if (!canEditAssignmentsForDate(targetDate)) {
            alert(getAssignmentRestrictionMessage(targetDate));
            return;
        }
        if (day?.date) {
            setSelectedDate(day.date);
            setPlannerWeekStart(getStartOfWeek(parseInputDate(day.date)));
        }
        setGeneralAssignmentDialogOpen(true);
    };

    const handleApplyDailyAssignment = async (payload) => {
        if (!canEditAssignmentsForDate(payload.date)) {
            alert(getAssignmentRestrictionMessage(payload.date));
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(
                `${backendUrl}/api/data/daily-routine-assignments/bulk-assign/`,
                {
                    ...payload,
                    center_id: selectedCenter,
                },
                {
                    headers: { Authorization: `Token ${token}` },
                }
            );

            setAssignmentResult(response.data);
            setAssignmentDialogOpen(false);
            await Promise.all([
                fetchWeekSummary(),
                fetchDailyAssignments(),
                viewMode === "day" ? fetchSessions() : Promise.resolve(),
            ]);
        } catch (error) {
            console.error("Error assigning daily routine:", error);
            const serverMessage = error?.response?.data?.date?.[0] || error?.response?.data?.date || error?.response?.data?.error;
            alert(serverMessage || "Error al aplicar la clase del día.");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyGeneralAssignment = async (payload) => {
        if (!canEditAssignmentsForDate(payload.date)) {
            alert(getAssignmentRestrictionMessage(payload.date));
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(
                `${backendUrl}/api/data/general-routine-assignments/bulk-assign/`,
                payload,
                {
                    headers: { Authorization: `Token ${token}` },
                }
            );

            setGeneralAssignmentResult(response.data);
            setGeneralAssignmentDialogOpen(false);
            await Promise.all([
                fetchGlobalWeekSummary(),
                selectedCenter ? fetchWeekSummary() : Promise.resolve(),
                selectedCenter ? fetchDailyAssignments() : Promise.resolve(),
                viewMode === "day" ? fetchSessions() : Promise.resolve(),
            ]);
        } catch (error) {
            console.error("Error assigning general routine:", error);
            const serverMessage = error?.response?.data?.date?.[0] || error?.response?.data?.date || error?.response?.data?.error;
            alert(serverMessage || "Error al aplicar la clase general.");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestDeleteGeneralAssignment = (day) => {
        if (!canEditAssignmentsForDate(day.date)) {
            alert(getAssignmentRestrictionMessage(day.date));
            return;
        }
        if (!day.general_assignment_id) return;
        setPendingAssignmentDelete({
            type: "general",
            id: day.general_assignment_id,
            date: day.date,
            title: "Quitar clase general",
            description: "Se eliminará la planificación general de este día. Las salas que seguían ese plan quedarán sin clase, y las salas con cambios propios se conservarán.",
            confirmLabel: "Quitar clase general",
        });
    };

    const handleRequestDeleteDailyAssignment = (assignment) => {
        if (!assignment) return;
        if (!canEditAssignmentsForDate(assignment.date)) {
            alert(getAssignmentRestrictionMessage(assignment.date));
            return;
        }
        setPendingAssignmentDelete({
            type: "daily",
            id: assignment.id,
            date: assignment.date,
            title: "Quitar clase de sala",
            description: assignment.general_routine_assignment
                ? "La sala quedará marcada como distinta al plan general y sus sesiones programadas quedarán sin clase, salvo las que tengan cambios manuales."
                : "La planificación de esta sala se quitará y sus sesiones programadas quedarán sin clase, salvo las que tengan cambios manuales.",
            confirmLabel: "Quitar clase de sala",
        });
    };

    const handleRequestClearPlannerDay = (day) => {
        if (!canEditAssignmentsForDate(day.date)) {
            alert(getAssignmentRestrictionMessage(day.date));
            return;
        }
        setPendingAssignmentDelete({
            type: "planner-day",
            centerId: selectedCenter,
            date: day.date,
            title: "Quitar clases del centro",
            description: "Se quitarán las clases asignadas a las salas de este centro para ese día. Las sesiones con cambios manuales se conservarán.",
            confirmLabel: "Quitar clases del centro",
        });
    };

    const handleConfirmAssignmentDelete = async () => {
        if (!pendingAssignmentDelete) return;

        setLoading(true);
        try {
            let response;
            if (pendingAssignmentDelete.type === "general") {
                response = await axios.delete(
                    `${backendUrl}/api/data/general-routine-assignments/${pendingAssignmentDelete.id}/`,
                    { headers: { Authorization: `Token ${token}` } }
                );
            } else if (pendingAssignmentDelete.type === "planner-day") {
                response = await axios.post(
                    `${backendUrl}/api/data/daily-routine-assignments/clear-day/`,
                    {
                        center_id: pendingAssignmentDelete.centerId,
                        date: pendingAssignmentDelete.date,
                    },
                    { headers: { Authorization: `Token ${token}` } }
                );
            } else {
                response = await axios.delete(
                    `${backendUrl}/api/data/daily-routine-assignments/${pendingAssignmentDelete.id}/`,
                    { headers: { Authorization: `Token ${token}` } }
                );
            }

            setAssignmentResult(null);
            setGeneralAssignmentResult(null);
            setAssignmentNotice({
                severity: "success",
                text: response.data?.message || "Asignación eliminada correctamente.",
            });
            setPendingAssignmentDelete(null);

            await Promise.all([
                fetchGlobalWeekSummary(),
                selectedCenter ? fetchWeekSummary() : Promise.resolve(),
                selectedCenter ? fetchDailyAssignments() : Promise.resolve(),
                viewMode === "day" ? fetchSessions() : Promise.resolve(),
            ]);
        } catch (error) {
            console.error("Error deleting assignment:", error);
            const serverMessage = error?.response?.data?.date?.[0] || error?.response?.data?.date || error?.response?.data?.error;
            alert(serverMessage || "No se pudo quitar la asignación.");
        } finally {
            setLoading(false);
        }
    };

    const renderFilters = () => {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" gap={1} sx={{ mb: 2, mt: 1 }}>
                <IconButton 
                    onClick={handlePreviousDay}
                    color="primary"
                    sx={{ 
                        border: '1px solid',
                        borderColor: 'primary.main',
                        borderRadius: 1
                    }}
                >
                    <ChevronLeftIcon />
                </IconButton>
                <TextField
                    label="Fecha"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 200 }}
                />
                <IconButton 
                    onClick={handleNextDay}
                    color="primary"
                    sx={{ 
                        border: '1px solid',
                        borderColor: 'primary.main',
                        borderRadius: 1
                    }}
                >
                    <ChevronRightIcon />
                </IconButton>
            </Box>
        );
    };

    const handleDelete = (session) => {
        setSessionToDelete(session);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDeleteSingle = async () => {
        if (!sessionToDelete) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`${backendUrl}/api/data/routinesessions/${sessionToDelete.id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            setDeleteDialogOpen(false);
            setSessionToDelete(null);
            fetchSessions();
        } catch (error) {
            console.error("No se pudo eliminar la sesión:", error);
            alert("Error al eliminar la sesión.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleConfirmDeleteSeries = async () => {
        if (!sessionToDelete || !sessionToDelete.session_series?.id) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`${backendUrl}/api/data/routinesessions/${sessionToDelete.id}/delete-series/`, {
                headers: { Authorization: `Token ${token}` },
            });
            setDeleteDialogOpen(false);
            setSessionToDelete(null);
            fetchSessions();
        } catch (error) {
            console.error("No se pudo eliminar la serie:", error);
            alert("Error al eliminar la serie.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleEditSession = (session) => {
        setEditingSessionId(session.id);
        setSessionData({
            name: session.name || "",
            center_id: selectedCenter,
            room_id: session.room_id,
            scheduled_at: formatToInputDatetime(session.scheduled_at),
            routine_id: session.routine_id,
            user_id: session.user_id,
            duration: session.duration || 60,
            session_series_id: session.session_series?.id || null,
            session_series_name: session.session_series?.name || null
        });
        setSessionModalOpen(true);
    };

    const openRoutineSummary = (session) => {
        if (session.routine_id) {
            setSelectedRoutineId(session.routine_id);
            setSummaryOpen(true);
        }
    };

    function formatToInputDatetime(dateString) {
        const [day, month, yearTime] = dateString.split('/');
        const [year, time] = yearTime.split(' ');
        return `${year}-${month}-${day}T${time}`;
    }

    const getStateColor = (stateName) => {
        switch(stateName) {
            case 'Programada': return '#666';
            case 'En progreso': return '#2196F3';
            case 'Completada': return '#4CAF50';
            case 'Cancelada': return '#F44336';
            default: return '#666';
        }
    };    
    if (permissions == null) return null;

    if (permissions && !permissions.includes("core_data.view_sessionseries")) {
        router.push("/");
        return null;
    }

    // Obtener el nombre del centro seleccionado
    const selectedCenterObj = options.centers.find(c => c.id === selectedCenter);
    const selectedCenterName = selectedCenterObj ? selectedCenterObj.name : "";
    const selectedCenterRooms = options.rooms.filter(r => r.center === selectedCenter);

    return (
        <>
            <MainPage>
                <Head><title>Beness App | Planificación</title></Head>
                <Box width="100%">
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                        <Box display="flex" alignItems="center" flexWrap="wrap">
                            <h1 className={styles.title} style={{ margin: 0 }}>
                                {viewMode === "global"
                                    ? "Planificación"
                                    : viewMode === "planner"
                                        ? `Planificación - ${selectedCenterName}`
                                        : `Sesiones - ${selectedCenterName}`}
                            </h1>
                            {selectedCenter && viewMode !== "global" && (
                                <Button 
                                    variant="outlined" 
                                    size="small" 
                                    onClick={handleBackToGlobal}
                                    sx={{ ml: 2 }}
                                >
                                    Volver a general
                                </Button>
                            )}
                            {viewMode === "day" && (
                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<ArrowBackIcon />}
                                    onClick={handleBackToPlanner}
                                    sx={{ ml: 1 }}
                                >
                                    Volver a semana
                                </Button>
                            )}
                        </Box>
                        {permissions.includes("core_data.add_routinesession") && viewMode !== "global" && (
                            <Box
                                display="flex"
                                gap={1.5}
                                flexWrap="wrap"
                                width={isTabletDown ? "100%" : "auto"}
                                justifyContent={isTabletDown ? "stretch" : "flex-end"}
                            >
                                <Button
                                    onClick={() => handleOpenAssignmentDialog([])}
                                    variant="contained"
                                    color="success"
                                    sx={{ minWidth: 160, flex: isTabletDown ? "1 1 220px" : "0 0 auto" }}
                                    startIcon={<CalendarMonthIcon />}
                                    disabled={!canEditAssignmentsForDate(selectedDate)}
                                >
                                    + Asignar Clase
                                </Button>
                                <Button 
                                    onClick={handleOpenSeriesModal}
                                    variant="contained"
                                    color="secondary"
                                    sx={{ minWidth: 160, flex: isTabletDown ? "1 1 220px" : "0 0 auto" }}
                                >
                                    + Programar Serie
                                </Button>
                                <Button 
                                    onClick={handleOpenSessionModal}
                                    variant="contained"
                                    color="primary"
                                    sx={{ minWidth: 160, flex: isTabletDown ? "1 1 220px" : "0 0 auto" }}
                                >
                                    + Programar Sesión
                                </Button>
                            </Box>
                        )}
                    </Box>

                    {assignmentNotice && (
                        <Alert
                            severity={assignmentNotice.severity || "info"}
                            sx={{ mb: 2 }}
                            onClose={() => setAssignmentNotice(null)}
                        >
                            {assignmentNotice.text}
                        </Alert>
                    )}

                    {viewMode === "global" ? (
                        renderGeneralPlanningView()
                    ) : viewMode === "planner" ? (
                        renderPlannerView(selectedCenterRooms)
                    ) : (
                        <>
                            {renderFilters()}

                            {loadingSessions ? (
                                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                                    <CircularProgress size={40} />
                                </Box>
                            ) : (
                                <SessionsByRoomView
                                    rooms={selectedCenterRooms}
                                    sessions={sessions}
                                    dailyAssignments={dailyAssignments}
                                    selectedDate={selectedDate}
                                    onEdit={handleEditSession}
                                    onDelete={handleDelete}
                                    onSummary={openRoutineSummary}
                                    onFeedback={handleOpenFeedback}
                                    onViewLogs={handleOpenLogs}
                                    onEditAssignment={handleOpenAssignmentDialog}
                                    onDeleteAssignment={handleRequestDeleteDailyAssignment}
                                    assignmentEditingDisabled={!canEditAssignmentsForDate(selectedDate)}
                                    assignmentEditingDisabledReason={getAssignmentRestrictionMessage(selectedDate)}
                                    permissions={permissions}
                                />
                            )}
                        </>
                    )}
                </Box>
            </MainPage>
            
            <AddSessionDialog
                open={sessionModalOpen}
                onClose={() => setSessionModalOpen(false)}
                onConfirm={handleCreateSession}
                sessionData={sessionData}
                setSessionData={setSessionData}
                filters={routineFilters}
                setFilters={setRoutineFilters}
                routinesToShow={routinesToShow}
                options={options}
                isEdit={editingSessionId !== null}
                sessionId={editingSessionId}
                sessionSeriesId={sessionData.session_series_id}
                sessionSeriesName={sessionData.session_series_name}
            />

            <AddSessionSeriesDialog
                open={seriesModalOpen}
                onClose={() => setSeriesModalOpen(false)}
                onConfirm={handleCreateSeries}
                centerId={selectedCenter}
                options={options}
                routineFilters={routineFilters}
                setRoutineFilters={setRoutineFilters}
                routinesToShow={routinesToShow}
            />

            <RoutineSummaryDialog
                open={summaryOpen}
                onClose={() => setSummaryOpen(false)}
                routineId={selectedRoutineId}
                token={token}
                backendUrl={backendUrl}
            />

            <FeedbackDialog
                open={feedbackOpen}
                onClose={() => {
                    setFeedbackOpen(false);
                    setSelectedSession(null);
                }}
                onSave={handleSaveFeedback}
                session={selectedSession}
                currentUserId={userId}
                key={selectedSession?.id}
            />

            <SessionLogsDialog
                open={logsOpen}
                onClose={() => {
                    setLogsOpen(false);
                    setSelectedSessionForLogs(null);
                }}
                sessionId={selectedSessionForLogs?.id}
                sessionName={selectedSessionForLogs?.name || `Sesión ${selectedSessionForLogs?.id}`}                token={token}
                backendUrl={backendUrl}            />

            <DeleteSessionDialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setSessionToDelete(null);
                }}
                onDeleteSingle={handleConfirmDeleteSingle}
                onDeleteSeries={handleConfirmDeleteSeries}
                session={sessionToDelete}
                loading={deleteLoading}
            />

            <DailyRoutineAssignmentDialog
                open={assignmentDialogOpen}
                onClose={() => setAssignmentDialogOpen(false)}
                onConfirm={handleApplyDailyAssignment}
                centerName={selectedCenterName}
                selectedDate={selectedDate}
                rooms={selectedCenterRooms}
                routines={allRoutines}
                loading={loading}
                initialRoomIds={assignmentInitialRoomIds}
                defaultMode={assignmentDefaultMode}
            />

            <GeneralRoutineAssignmentDialog
                open={generalAssignmentDialogOpen}
                onClose={() => setGeneralAssignmentDialogOpen(false)}
                onConfirm={handleApplyGeneralAssignment}
                selectedDate={selectedDate}
                routines={allRoutines}
                centersCount={options.centers.length}
                roomsCount={options.rooms.length}
                loading={loading}
            />

            <Dialog
                open={Boolean(pendingAssignmentDelete)}
                onClose={() => setPendingAssignmentDelete(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{pendingAssignmentDelete?.title || "Quitar asignación"}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1.5 }}>
                        {pendingAssignmentDelete?.date ? formatReadableDate(pendingAssignmentDelete.date) : ""}
                    </Typography>
                    <Typography variant="body1">
                        {pendingAssignmentDelete?.description || "Esta acción quitará la asignación seleccionada."}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingAssignmentDelete(null)}>
                        Cancelar
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleConfirmAssignmentDelete}
                        disabled={loading}
                    >
                        {pendingAssignmentDelete?.confirmLabel || "Quitar asignación"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={notesDialogOpen}
                onClose={() => {
                    setNotesDialogOpen(false);
                    setSelectedGeneralNotes(null);
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    Nota de planificación
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {selectedGeneralNotes?.date ? formatReadableDate(selectedGeneralNotes.date) : ""}
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                        {selectedGeneralNotes?.notes || "Sin nota disponible."}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setNotesDialogOpen(false);
                            setSelectedGeneralNotes(null);
                        }}
                    >
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Indicador de carga */}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }}
                open={loading}
            >
                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <CircularProgress color="inherit" size={60} />
                    <Typography variant="h6">
                        Procesando... Por favor espere
                    </Typography>
                </Box>
            </Backdrop>
        </>
    );
}

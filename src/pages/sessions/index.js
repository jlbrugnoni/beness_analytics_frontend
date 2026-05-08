import MainPage from "@/pages/mainPage";
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import {
    MenuItem, FormControl, InputLabel, Grid, Select, TextField, Button, Box,
    Card, CardContent, Typography, Alert, CircularProgress, Avatar
} from "@mui/material";
import TableComponent from "@/components/TableComponent";
import useFetchToken from "@/components/useFetchUserId";
import Head from "next/head";
import usePermissions from "@/hooks/usePermissions";
import styles from "@/styles/FilterTablePage.module.css";
import responsiveStyles from "@/styles/responsive.module.css";
import RoutineSummaryDialog from "@/components/RoutineSummaryDialog";
import FeedbackDialog from "@/components/FeedBackDialog";
import { Accordion, AccordionSummary, AccordionDetails, useMediaQuery } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "@mui/material/styles";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";

export default function SessionsTable() {
    const router = useRouter();
    const token = useFetchToken(); // Token de la plataforma (usuario temporal)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const permissions = usePermissions();
    
    // Estado para el login secundario del monitor
    const [monitorAuthenticated, setMonitorAuthenticated] = useState(false);
    const [monitorData, setMonitorData] = useState(null);
    const [monitorToken, setMonitorToken] = useState(null);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    // Filtros y datos de sesiones
    const [filters, setFilters] = useState({        
        room_id: "",
        routine_id: "",
        scheduled_at__gte: "",
        scheduled_at__lte: ""
    });

    const [sessions, setSessions] = useState([]);
    const [options, setOptions] = useState({ centers: [], rooms: [], routines: [] });
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
        
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [selectedRoutineId, setSelectedRoutineId] = useState(null);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);

    const inactivityTimerRef = useRef(null);
    const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minuto en milisegundos
    
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
                
        if (monitorAuthenticated) {
            inactivityTimerRef.current = setTimeout(() => {                
                window.location.reload();
            }, INACTIVITY_TIMEOUT);
        }
    }, [monitorAuthenticated]);
    
    useEffect(() => {
        const activityEvents = ['keydown', 'click', 'scroll', 'touchstart', 'touchmove'];
        
        const handleActivity = () => {
            console.log("Actividad detectada, reseteando temporizador de inactividad");
            resetInactivityTimer();
        };
        
        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        resetInactivityTimer();

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [resetInactivityTimer]);
    
    useEffect(() => {
        const now = new Date();
        now.setHours(7, 0, 0, 0);

        setFilters((prev) => ({
            ...prev,
            scheduled_at__gte: formatDateToLocalDatetimeInput(now)
        }));
    }, []);
    
    useEffect(() => {
        if (monitorAuthenticated && monitorToken) {
            fetchOptions();
        }
    }, [monitorAuthenticated, monitorToken]);
        
    useEffect(() => {        
        if (monitorAuthenticated && monitorToken) {
            fetchSessions();
        }
    }, [filters, page, rowsPerPage, monitorAuthenticated, monitorToken]);
    
    const handleMonitorLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        setLoginLoading(true);

        try {
            const response = await axios.post(`${backendUrl}/api/data/login`, {
                email: loginEmail,
                password: loginPassword,
                login_type: 'secondary'
            });

            if (response.data.token) {
                setMonitorToken(response.data.token);
                setMonitorData({
                    id: response.data.id,
                    username: response.data.username,
                    email: response.data.email,
                    first_name: response.data.first_name,
                    last_name: response.data.last_name,
                    image: response.data.image
                });
                setMonitorAuthenticated(true);
                setLoginEmail("");
                setLoginPassword("");
            }
        } catch (error) {
            console.error("Error en login de monitor:", error);
            setLoginError("Credenciales incorrectas. Inténtalo de nuevo.");
        } finally {
            setLoginLoading(false);
        }
    };
    
    const handleMonitorLogout = () => {
        setMonitorAuthenticated(false);
        setMonitorData(null);
        setMonitorToken(null);
        setSessions([]);
        setLoginEmail("");
        setLoginPassword("");
    };

    const fetchOptions = async () => {
        try {
            const [centersRes, routinesRes] = await Promise.all([
                axios.get(`${backendUrl}/api/data/all_centers_and_rooms/`, { 
                    headers: { Authorization: `Token ${monitorToken}` } 
                }),
                axios.get(`${backendUrl}/api/data/all_routines/`, { 
                    headers: { Authorization: `Token ${monitorToken}` } 
                }),
            ]);

            setOptions({
                centers: centersRes.data || [],
                rooms: centersRes.data.flatMap(c => c.rooms || []),
                routines: routinesRes.data || [],
            });
        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    const fetchSessions = async () => {
        try {
            // Siempre filtrar por el monitor autenticado
            const params = { 
                ...filters, 
                user_id: monitorData.id,
                page: page + 1, 
                page_size: rowsPerPage 
            };
            
            const response = await axios.get(`${backendUrl}/api/data/routinesessions/`, {
                headers: { Authorization: `Token ${monitorToken}` },
                params
            });

            setSessions(response.data.results || []);
            setTotalCount(response.data.count || 0);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            setSessions([]);
        }
    };

    const handleChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));        
    };

    const handlePageChange = (event, newPage) => setPage(newPage);
    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleOpenFeedback = (session) => {
        setSelectedSession(session);
        setFeedbackOpen(true);
    };

    const handleSaveFeedback = async (feedback) => {
        try {
            await axios.patch(`${backendUrl}/api/data/routinesessions/${selectedSession.id}/`, {
                userFeedback: feedback
            }, {
                headers: { Authorization: `Token ${monitorToken}` },
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

    const openRoutineSummary = (session) => {
        if (session.routine_id) {
            setSelectedRoutineId(session.routine_id);
            setSummaryOpen(true);
        }
    };

    const getStateColor = (stateName) => {
        switch(stateName) {
            case 'Programada': return '#666';
            case 'En progreso': return '#2196F3';
            case 'Completada': return '#4CAF50';
            case 'Cancelada': return '#F44336';
            default: return '#666';
        }
    };

    const renderFilters = () => (
        <>
            <Grid className={styles.filterContainer}>                
                <Grid item className={styles.filterItem} sx={{ marginBottom: { xs: 1, sm: 0 } }}>
                    <FormControl fullWidth>
                        <InputLabel>Sala</InputLabel>
                        <Select
                            value={filters.room_id}
                            onChange={(e) => handleChange("room_id", e.target.value)}
                        >
                            <MenuItem value="">Todas</MenuItem>
                            {options.rooms.map((room) => (
                                <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item className={styles.filterItem} sx={{ marginBottom: { xs: 2, sm: 0 } }}>
                    <FormControl fullWidth>
                        <InputLabel>Clase</InputLabel>
                        <Select
                            value={filters.routine_id}
                            onChange={(e) => handleChange("routine_id", e.target.value)}
                        >
                            <MenuItem value="">Todas</MenuItem>
                            {options.routines.map((r) => (
                                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item className={styles.filterItem} sx={{ marginBottom: { xs: 2, sm: 0 } }}>
                    <TextField
                        label="Fecha desde"
                        type="datetime-local"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={filters.scheduled_at__gte}
                        onChange={(e) => handleChange("scheduled_at__gte", e.target.value)}
                    />
                </Grid>

                <Grid item className={styles.filterItem} sx={{ marginBottom: { xs: 2, sm: 0 } }}>
                    <TextField
                        label="Fecha hasta"
                        type="datetime-local"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={filters.scheduled_at__lte}
                        onChange={(e) => handleChange("scheduled_at__lte", e.target.value)}
                    />
                </Grid>
            </Grid>
        </>
    );

    if (permissions == null) return null;

    // Redirigir si no tiene permisos para ver sesiones
    if (permissions && !permissions.includes("core_data.view_routinesession")) {
        router.push("/");
        return null;
    }

    // Pantalla de login del monitor
    if (!monitorAuthenticated) {
        return (
            <MainPage>
                <Head><title>Beness App | Identificación de Monitor</title></Head>
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="70vh"
                >
                    <Card sx={{ maxWidth: 400, width: '100%', p: 2 }}>
                        <CardContent>
                            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                                <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, mb: 2 }}>
                                    <LockIcon sx={{ fontSize: 30 }} />
                                </Avatar>
                                <Typography variant="h5" component="h1" gutterBottom>
                                    Bienvenido
                                </Typography>
                                <Typography variant="body2" color="textSecondary" textAlign="center">
                                    Introduce tus credenciales para ver tus sesiones programadas
                                </Typography>
                            </Box>

                            {loginError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {loginError}
                                </Alert>
                            )}

                            <form onSubmit={handleMonitorLogin} autoComplete="off">
                                <TextField
                                    label="Usuario"
                                    type="text"
                                    name="monitor_identifier"
                                    fullWidth
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    required
                                    sx={{ mb: 2 }}
                                    autoComplete="off"
                                    inputProps={{
                                        autoComplete: "off",
                                        inputMode: "text",
                                        autoCorrect: "off",
                                        autoCapitalize: "off",
                                        spellCheck: "false",
                                        "data-form-type": "other",
                                        "data-lpignore": "true",
                                        "data-1p-ignore": "true"
                                    }}
                                />
                                <TextField
                                    label="Contraseña"
                                    type="text"
                                    name="monitor_secret"
                                    fullWidth
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    required
                                    sx={{ mb: 3 }}
                                    autoComplete="off"
                                    inputProps={{
                                        autoComplete: "off",
                                        "data-form-type": "other",
                                        "data-lpignore": "true",
                                        "data-1p-ignore": "true",
                                        style: { WebkitTextSecurity: "disc" }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    disabled={loginLoading}
                                    startIcon={loginLoading ? <CircularProgress size={20} color="inherit" /> : <PersonIcon />}
                                >
                                    {loginLoading ? "Verificando..." : "Acceder"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </Box>
            </MainPage>
        );
    }

    // Pantalla principal con sesiones del monitor
    return (
        <>
            <MainPage>
                <Head><title>Beness App | Mis Sesiones</title></Head>

                <div className={styles.titleContainer}>
                    <Box display="flex" alignItems="center" gap={2}>
                        {monitorData?.image && (
                            <Avatar src={monitorData.image} alt={monitorData.first_name} />
                        )}
                        <Box>
                            <h1 className={styles.title} style={{ margin: 0 }}>
                                Mis Sesiones
                            </h1>
                            <Typography variant="body2" color="textSecondary">
                                {monitorData?.first_name} {monitorData?.last_name}
                            </Typography>
                        </Box>
                    </Box>
                    <Button 
                        variant="outlined" 
                        color="secondary"
                        startIcon={<LogoutIcon />}
                        onClick={handleMonitorLogout}
                    >
                        SALIR
                    </Button>
                </div>

                {isMobile ? (
                    <Box sx={{ width: "98%" }}>
                        <Accordion sx={{ width: "100%" }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <strong>Filtros</strong>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={1}>
                                    {renderFilters()}
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                ) : (
                    <Grid container spacing={0} className={styles.filterContainer}>
                        {renderFilters()}
                    </Grid>
                )}

                <TableComponent
                    data={sessions || []}
                    entityName="Sesiones"
                    columns={[
                        // COLUMNAS PARA ESCRITORIO
                        { label: "Fecha", field: "scheduled_at", className: responsiveStyles.hideOnMobile },
                        {
                            label: "Sala",
                            field: "room",
                            className: responsiveStyles.hideOnMobile,
                            render: (row) => (
                                <div>
                                    <div>{row.room}</div>
                                    <div style={{ fontSize: "0.8em", color: "#666" }}>({row.center})</div>
                                </div>
                            )
                        },
                        { 
                            label: "Clase", 
                            field: "routine", 
                            className: responsiveStyles.hideOnMobile,
                            render: (row) => (
                                <div>
                                    <div>{row.routine || 'Sin clase asignada'}</div>
                                    <div style={{ fontSize: "0.8em", color: getStateColor(row.state_name) }}>
                                        ({row.state_name || 'Sin estado'})
                                    </div>
                                    {row.userFeedback && (
                                        <div style={{ fontSize: "0.7em", color: "#888", fontStyle: "italic" }}>
                                            {row.userFeedback.substring(0, 50)}{row.userFeedback.length > 50 ? '...' : ''}
                                        </div>
                                    )}
                                </div>
                            )
                        },
                        // COLUMNA UNIFICADA PARA MÓVIL
                        {
                            label: "Datos",
                            field: "info",
                            className: responsiveStyles.showOnlyOnMobile,
                            render: (row) => (
                                <div>
                                    <div><strong>Fecha:</strong> {row.scheduled_at}</div>
                                    <div><strong>Sala:</strong> {row.room}<span style={{ fontSize: "0.8em", color: "#666", marginLeft: "0.4em" }}>({row.center})</span></div>
                                    <div><strong>Clase:</strong> {row.routine || 'Sin clase'} <span style={{ fontSize: "0.8em", color: getStateColor(row.state_name) }}>({row.state_name || 'Sin estado'})</span></div>
                                    {row.userFeedback && (
                                        <div><strong>Feedback:</strong> <span style={{ fontSize: "0.8em", color: "#888", fontStyle: "italic" }}>
                                            {row.userFeedback.substring(0, 30)}{row.userFeedback.length > 30 ? '...' : ''}
                                        </span></div>
                                    )}
                                </div>
                            )
                        }
                    ]}
                    onSummary={openRoutineSummary}
                    onFeedback={handleOpenFeedback}
                    totalCount={totalCount}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handlePageChange}
                    onRowsPerPageChange={handleRowsPerPageChange}
                />
            </MainPage>

            <RoutineSummaryDialog
                open={summaryOpen}
                onClose={() => setSummaryOpen(false)}
                routineId={selectedRoutineId}
                token={monitorToken}
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
                currentUserId={monitorData?.id}
                key={selectedSession?.id}
            />
        </>
    );
}

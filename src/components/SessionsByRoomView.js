import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    Grid,
    IconButton,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FeedbackIcon from "@mui/icons-material/Feedback";
import WarningIcon from "@mui/icons-material/Warning";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

export default function SessionsByRoomView({ 
    rooms, 
    sessions, 
    dailyAssignments = [],
    onEdit, 
    onDelete, 
    onSummary, 
    onFeedback,
    onViewLogs,
    onEditAssignment,
    onDeleteAssignment,
    assignmentEditingDisabled = false,
    assignmentEditingDisabledReason = "",
    permissions 
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isTabletDown = useMediaQuery(theme.breakpoints.down("lg"));
    const singleRoomLayout = rooms.length === 1;

    // Función para extraer hora de scheduled_at
    const extractTime = (scheduledAt) => {
        const parts = scheduledAt.split(' ');
        if (parts.length > 1) {
            const time = parts[1];
            return time.substring(0, 5); // HH:MM
        }
        return '';
    };

    const parseSessionDate = (scheduledAt) => {
        if (!scheduledAt) return null;
        const [datePart, timePart = "00:00"] = scheduledAt.split(" ");
        const [day, month, year] = datePart.split("/");
        if (!day || !month || !year) return null;
        return new Date(`${year}-${month}-${day}T${timePart}`);
    };

    const getTodayDateString = () => {
        const now = new Date();
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return localNow.toISOString().split("T")[0];
    };

    const isPastSession = (session) => {
        const sessionDate = parseSessionDate(session.scheduled_at);
        if (!sessionDate || Number.isNaN(sessionDate.getTime())) return false;
        const localSessionDate = new Date(sessionDate.getTime() - sessionDate.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0];
        return localSessionDate < getTodayDateString();
    };

    const canEditSessionRoutine = (session) => session.state === 0 && !isPastSession(session);

    // Calcular rango de horas dinámicamente basado en las sesiones
    const calculateHourRange = () => {
        if (!sessions || sessions.length === 0) {
            return { startHour: 10, endHour: 23 }; // Valores por defecto
        }
        
        let minHour = 10; // Default mínimo
        let maxHour = 23; // Default máximo
        
        sessions.forEach(session => {
            const time = extractTime(session.scheduled_at);
            if (time) {
                const [hours, minutes] = time.split(':').map(Number);
                
                // Actualizar hora mínima
                if (hours < minHour) minHour = hours;
                
                // Calcular hora máxima considerando la duración de la sesión
                const durationMinutes = session.duration || session.routine_duration || 60;
                const sessionMinutes = hours * 60 + minutes;
                const endMinutes = sessionMinutes + durationMinutes;
                const endHour = Math.ceil(endMinutes / 60);
                if (endHour > maxHour) maxHour = endHour;
            }
        });
        
        return { startHour: minHour, endHour: maxHour };
    };

    const { startHour: START_HOUR, endHour: END_HOUR } = calculateHourRange();
    
    // Configuración de slots de tiempo
    const SLOT_MINUTES = 15; // Slots de 15 minutos
    const SLOT_HEIGHT = 25; // Altura en píxeles de cada slot de 15min
    const DEFAULT_DURATION_MINUTES = 60; // Duración por defecto si no hay duración definida
    
    // Función para calcular cuántos slots ocupa una sesión según su duración
    const getSessionSlots = (session) => {
        // Prioridad: 1) duration de la sesión, 2) duration de la routine, 3) default 60 min
        const durationMinutes = session.duration || session.routine_duration || DEFAULT_DURATION_MINUTES;
        return Math.ceil(durationMinutes / SLOT_MINUTES);
    };

    // Generar todos los slots de tiempo del día
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
                if (hour === END_HOUR && minute > 0) break; // No pasar de 23:00
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push(timeString);
            }
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    // Agrupar sesiones por sala
    const sessionsByRoom = rooms.reduce((acc, room) => {
        acc[room.id] = sessions.filter(s => s.room_id === room.id);
        return acc;
    }, {});

    // Función para encontrar el índice del slot más cercano para una sesión
    const findSlotIndex = (sessionTime) => {
        const [hours, minutes] = sessionTime.split(':').map(Number);
        const sessionMinutes = hours * 60 + minutes;
        const startMinutes = START_HOUR * 60;
        const relativeMinutes = sessionMinutes - startMinutes;
        const slotIndex = Math.floor(relativeMinutes / SLOT_MINUTES);
        return slotIndex >= 0 ? slotIndex : 0;
    };

    // Mapear sesiones a slots
    const mapSessionsToSlots = (roomSessions) => {
        const slotMap = {};
        roomSessions.forEach(session => {
            const sessionTime = extractTime(session.scheduled_at);
            const slotIndex = findSlotIndex(sessionTime);
            slotMap[slotIndex] = session;
        });
        return slotMap;
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

    const getAssignmentForRoom = (roomId) => {
        return dailyAssignments.find((assignment) => assignment.room?.id === roomId);
    };

    const getAssignmentSource = (assignment) => {
        if (!assignment) {
            return {
                label: "Sin asignación",
                color: "default",
                description: "Esta sala no tiene una clase planificada para el día.",
            };
        }

        if (assignment.general_routine_assignment && assignment.overrides_general_assignment) {
            return {
                label: "Cambio en sala",
                color: "warning",
                description: "Esta sala tiene una clase distinta a la planificación general.",
            };
        }

        if (assignment.general_routine_assignment) {
            return {
                label: "Plan general",
                color: "success",
                description: "Esta sala sigue la planificación general del día.",
            };
        }

        return {
            label: "Plan de sala",
            color: "info",
            description: "Esta sala tiene una planificación propia para el día.",
        };
    };

    const renderRoomAssignmentHeader = (room) => {
        const assignment = getAssignmentForRoom(room.id);
        const assignmentSource = getAssignmentSource(assignment);

        return (
            <Box
                sx={{
                    mt: 0.75,
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: assignment ? "rgba(25, 118, 210, 0.08)" : "rgba(0, 0, 0, 0.03)",
                    border: "1px solid",
                    borderColor: assignment ? "rgba(25, 118, 210, 0.18)" : "rgba(0, 0, 0, 0.08)",
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Clase del día
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1.25,
                                color: assignment ? "text.primary" : "text.secondary",
                            }}
                        >
                            {assignment?.routine?.name || "Sin clase asignada"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {assignmentSource.description}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.75}>
                        {assignment && onDeleteAssignment && permissions?.includes("core_data.add_routinesession") && (
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => onDeleteAssignment(assignment)}
                                disabled={assignmentEditingDisabled}
                                title={assignmentEditingDisabled ? assignmentEditingDisabledReason : "Quitar asignación"}
                                sx={{
                                    backgroundColor: "rgba(211, 47, 47, 0.10)",
                                    border: "1px solid",
                                    borderColor: "rgba(211, 47, 47, 0.22)",
                                    width: 34,
                                    height: 34,
                                    "&:hover": {
                                        backgroundColor: "rgba(211, 47, 47, 0.16)",
                                    },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}
                        {onEditAssignment && permissions?.includes("core_data.add_routinesession") && (
                            <IconButton
                                size="small"
                                color={assignment ? "primary" : "success"}
                                onClick={() => onEditAssignment([room.id])}
                                disabled={assignmentEditingDisabled}
                                title={assignmentEditingDisabled ? assignmentEditingDisabledReason : (assignment ? "Editar asignación" : "Asignar clase")}
                                sx={{
                                    backgroundColor: assignment ? "rgba(25, 118, 210, 0.10)" : "rgba(46, 125, 50, 0.10)",
                                    border: "1px solid",
                                    borderColor: assignment ? "rgba(25, 118, 210, 0.25)" : "rgba(46, 125, 50, 0.25)",
                                    width: 34,
                                    height: 34,
                                    "&:hover": {
                                        backgroundColor: assignment ? "rgba(25, 118, 210, 0.16)" : "rgba(46, 125, 50, 0.16)",
                                    },
                                }}
                            >
                                {assignment ? <EditIcon fontSize="small" /> : <AddCircleOutlineIcon fontSize="small" />}
                            </IconButton>
                        )}
                    </Box>
                </Box>

                <Box mt={1} display="flex" flexWrap="wrap" gap={0.75}>
                    <Chip
                        label={assignmentSource.label}
                        size="small"
                        color={assignmentSource.color}
                        variant={assignmentSource.color === "default" ? "outlined" : "filled"}
                    />
                    {assignment?.overridden_sessions_count > 0 && (
                        <Chip
                            label={`${assignment.overridden_sessions_count} cambios manuales`}
                            size="small"
                            color="warning"
                        />
                    )}
                </Box>
            </Box>
        );
    };

    const renderRoomAssignmentSummary = (room) => {
        const assignment = getAssignmentForRoom(room.id);
        const assignmentSource = getAssignmentSource(assignment);

        return (
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mt={0.5}>
                <Box minWidth={0}>
                    <Typography variant="caption" color="text.secondary">
                        Clase del día
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            color: assignment ? "text.primary" : "text.secondary",
                            lineHeight: 1.25,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {assignment?.routine?.name || "Sin clase asignada"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {assignmentSource.label}
                    </Typography>
                </Box>
                {(assignment?.overridden_sessions_count > 0 || assignmentSource.color !== "default") && (
                    <Box display="flex" gap={0.5} flexShrink={0}>
                    {assignmentSource.color !== "default" && (
                    <Chip
                        label={assignmentSource.label}
                        size="small"
                        color={assignmentSource.color}
                        variant="outlined"
                    />
                    )}
                {assignment?.overridden_sessions_count > 0 && (
                    <Chip
                        label={`${assignment.overridden_sessions_count} cambios`}
                        size="small"
                        color="warning"
                    />
                )}
                    </Box>
                )}
            </Box>
        );
    };

    const renderSessionActions = (session, compact = false) => (
        <Box
            sx={{
                display: 'flex',
                justifyContent: compact ? 'flex-start' : 'flex-end',
                gap: 0.3,
                flexWrap: 'wrap',
            }}
        >
            {onViewLogs && (
                <IconButton 
                    size={isTabletDown ? "medium" : "small"}
                    color="secondary"
                    onClick={() => onViewLogs(session)}
                    title="Ver logs"
                    sx={{
                        padding: isTabletDown ? '6px' : '2px',
                        width: isTabletDown ? 40 : 'auto',
                        height: isTabletDown ? 40 : 'auto',
                    }}
                >
                    <HistoryIcon sx={{ fontSize: isTabletDown ? '1.4rem' : '1rem' }} />
                </IconButton>
            )}
            {session.routine_id && (
                <IconButton 
                    size={isTabletDown ? "medium" : "small"}
                    color="info"
                    onClick={() => onSummary(session)}
                    title="Ver resumen"
                    sx={{
                        padding: isTabletDown ? '6px' : '2px',
                        width: isTabletDown ? 40 : 'auto',
                        height: isTabletDown ? 40 : 'auto',
                    }}
                >
                    <VisibilityIcon sx={{ fontSize: isTabletDown ? '1.4rem' : '1rem' }} />
                </IconButton>
            )}
            {onFeedback && (
                <IconButton 
                    size={isTabletDown ? "medium" : "small"}
                    color="primary"
                    onClick={() => onFeedback(session)}
                    title="Feedback"
                    sx={{
                        padding: isTabletDown ? '6px' : '2px',
                        width: isTabletDown ? 40 : 'auto',
                        height: isTabletDown ? 40 : 'auto',
                    }}
                >
                    <FeedbackIcon sx={{ fontSize: isTabletDown ? '1.4rem' : '1rem' }} />
                </IconButton>
            )}
            {onEdit && permissions?.includes("core_data.change_routinesession") && canEditSessionRoutine(session) && (
                <IconButton 
                    size={isTabletDown ? "medium" : "small"}
                    color="primary"
                    onClick={() => onEdit(session)}
                    title="Editar"
                    sx={{
                        padding: isTabletDown ? '6px' : '2px',
                        width: isTabletDown ? 40 : 'auto',
                        height: isTabletDown ? 40 : 'auto',
                    }}
                >
                    <EditIcon sx={{ fontSize: isTabletDown ? '1.4rem' : '1rem' }} />
                </IconButton>
            )}
            {onDelete && permissions?.includes("core_data.delete_routinesession") && (
                <IconButton 
                    size={isTabletDown ? "medium" : "small"}
                    color="error"
                    onClick={() => onDelete(session)}
                    title="Eliminar"
                    sx={{
                        padding: isTabletDown ? '6px' : '2px',
                        width: isTabletDown ? 40 : 'auto',
                        height: isTabletDown ? 40 : 'auto',
                    }}
                >
                    <DeleteIcon sx={{ fontSize: isTabletDown ? '1.4rem' : '1rem' }} />
                </IconButton>
            )}
        </Box>
    );

    if (isMobile) {
        return (
            <Box display="flex" flexDirection="column" gap={2}>
                {rooms.map((room) => {
                    const roomSessions = [...(sessionsByRoom[room.id] || [])].sort((a, b) => {
                        const [dayA, monthA, yearTimeA] = a.scheduled_at.split('/');
                        const [yearA, timeA] = yearTimeA.split(' ');
                        const [dayB, monthB, yearTimeB] = b.scheduled_at.split('/');
                        const [yearB, timeB] = yearTimeB.split(' ');
                        return new Date(`${yearA}-${monthA}-${dayA}T${timeA}`) - new Date(`${yearB}-${monthB}-${dayB}T${timeB}`);
                    });

                    return (
                        <Accordion key={room.id} disableGutters sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box display="flex" flexDirection="column" width="100%">
                                    <Typography fontWeight="bold" color="primary.main">
                                        {room.name}
                                    </Typography>
                                    {renderRoomAssignmentSummary(room)}
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {roomSessions.length} sesión(es)
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 1.5, pb: 1.5 }}>
                                {roomSessions.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        No hay sesiones programadas para esta sala en la fecha seleccionada.
                                    </Typography>
                                ) : (
                                    <Box display="flex" flexDirection="column" gap={1.25}>
                                        {roomSessions.map((session) => (
                                            <Card key={session.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
                                                        <Box>
                                                            <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                                                                {extractTime(session.scheduled_at)}
                                                            </Typography>
                                                            {session.name && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {session.name}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <Chip
                                                            label={session.state_name || 'Sin estado'}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: getStateColor(session.state_name),
                                                                color: '#fff',
                                                            }}
                                                        />
                                                    </Box>

                                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                                        <strong>Monitor:</strong> {session.user || 'Sin asignar'}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                                        <strong>Clase:</strong>
                                                        {session.routine ? (
                                                            <span>{session.routine}</span>
                                                        ) : (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff9800' }}>
                                                                <WarningIcon sx={{ fontSize: '0.95rem' }} />
                                                                Sin clase
                                                            </span>
                                                        )}
                                                    </Typography>

                                                    {session.routine_manually_overridden && (
                                                        <Chip
                                                            label="Cambio manual"
                                                            size="small"
                                                            color="warning"
                                                            sx={{ mb: 0.75 }}
                                                        />
                                                    )}

                                                    {session.userFeedback && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                                                            💬 {session.userFeedback}
                                                        </Typography>
                                                    )}

                                                    <Divider sx={{ my: 1 }} />
                                                    {renderSessionActions(session, true)}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>
        );
    }

    return (
        <Grid container spacing={2}>
            {rooms.map(room => {
                const roomSessions = sessionsByRoom[room.id] || [];
                const sessionSlots = mapSessionsToSlots(roomSessions);

                return (
                    <Grid item xs={12} md={singleRoomLayout ? 12 : 6} lg={singleRoomLayout ? 12 : 3} key={room.id}>
                        <Box sx={{ 
                            border: '1px solid #ddd', 
                            borderRadius: 2, 
                            p: 2,
                            backgroundColor: '#fafafa'
                        }}>
                            <Box
                                sx={{
                                    mb: 2,
                                    pb: 1.5,
                                    borderBottom: '2px solid',
                                    borderColor: 'primary.main',
                                    backgroundColor: '#fafafa',
                                }}
                            >
                                <Typography 
                                    variant="h6" 
                                    sx={{ 
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        color: 'primary.main',
                                    }}
                                >
                                    {room.name}
                                </Typography>

                                {renderRoomAssignmentHeader(room)}
                            </Box>

                            {/* Grid de tiempo */}
                            <Box sx={{ position: 'relative' }}>
                                {timeSlots.map((timeSlot, index) => {
                                    const session = sessionSlots[index];
                                    const isHourMark = timeSlot.endsWith(':00');

                                    return (
                                        <Box 
                                            key={index}
                                            sx={{ 
                                                height: `${SLOT_HEIGHT}px`,
                                                position: 'relative',
                                                borderTop: isHourMark ? '1px solid #ddd' : '1px dashed #eee',
                                            }}
                                        >
                                            {/* Etiqueta de hora */}
                                            {isHourMark && (
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                        position: 'absolute',
                                                        left: -20,
                                                        top: -8,
                                                        fontSize: '0.7rem',
                                                        color: '#999',
                                                        backgroundColor: 'rgba(250, 250, 250, 0.9)',
                                                        padding: '0 4px',
                                                        borderRadius: '2px',
                                                        zIndex: 1
                                                    }}
                                                >
                                                    {timeSlot}
                                                </Typography>
                                            )}

                                            {/* Sesión si existe en este slot */}
                                            {session && (
                                                <Card 
                                                    sx={{ 
                                                        position: 'absolute',
                                                        top: 2,
                                                        left: 0,
                                                        right: 0,
                                                        height: `${SLOT_HEIGHT * getSessionSlots(session) - 4}px`,
                                                        boxShadow: 2,
                                                        '&:hover': { boxShadow: 4 },
                                                        transition: 'box-shadow 0.3s',
                                                        backgroundColor: '#fff',
                                                        overflow: 'hidden',
                                                        zIndex: 2
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 1.5, pb: 0, height: '100%', '&:last-child': { pb: 0 }, overflow: 'auto', position: 'relative' }}>
                                                        {/* Hora, Nombre de sesión y Estado en una línea */}
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                                                                <Typography 
                                                                    variant="subtitle2" 
                                                                    sx={{ 
                                                                        fontWeight: 'bold',
                                                                        color: 'primary.main',
                                                                        fontSize: '1rem'
                                                                    }}
                                                                >
                                                                    {extractTime(session.scheduled_at)}
                                                                </Typography>
                                                                {session.name && (
                                                                    <Typography 
                                                                        variant="caption" 
                                                                        sx={{ 
                                                                            color: '#1976d2',
                                                                            fontStyle: 'italic',
                                                                            fontSize: '0.65rem'
                                                                        }}
                                                                    >
                                                                        {session.name}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                            <Chip 
                                                                label={session.state_name || 'Sin estado'}
                                                                size="small"
                                                                sx={{ 
                                                                    backgroundColor: getStateColor(session.state_name),
                                                                    color: '#fff',
                                                                    fontSize: '0.65rem',
                                                                    height: '20px'
                                                                }}
                                                            />
                                                        </Box>

{/* Monitor */}
                                                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.75rem', mb: 0.3 }}>
                                                            <strong>Monitor:</strong> {session.user || 'Sin asignar'}
                                                        </Typography>

                                                        {/* Clase */}
                                                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', mb: 0.5 }}>
                                                            <strong>Clase:</strong> 
                                                            {session.routine ? (
                                                                <span style={{ marginLeft: '4px' }}>{session.routine}</span>
                                                            ) : (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px', color: '#ff9800' }}>
                                                                    <WarningIcon sx={{ fontSize: '0.9rem' }} />
                                                                    Sin clase
                                                                </span>
                                                            )}
                                                        </Typography>

                                                        {session.routine_manually_overridden && (
                                                            <Chip
                                                                label="Cambio manual"
                                                                size="small"
                                                                color="warning"
                                                                sx={{ mb: 0.5, height: "20px", fontSize: "0.65rem" }}
                                                            />
                                                        )}

                                                        {/* Feedback */}
                                                        {session.userFeedback && (
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    color: '#888',
                                                                    fontStyle: 'italic',
                                                                    display: 'block',
                                                                    fontSize: '0.65rem',
                                                                    mb: 0
                                                                }}
                                                            >
                                                                💬 {session.userFeedback.substring(0, 30)}{session.userFeedback.length > 30 ? '...' : ''}
                                                            </Typography>
                                                        )}

                                                        {/* Acciones */}
                                                        <Box sx={{ 
                                                            position: 'absolute',
                                                            bottom: 4,
                                                            right: 4,
                                                            display: 'flex', 
                                                            justifyContent: 'flex-end', 
                                                            gap: 0.3,
                                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                            borderRadius: 1,
                                                            padding: '2px'
                                                        }}>
                                                            {renderSessionActions(session)}
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Grid>
                );
            })}
        </Grid>
    );
}

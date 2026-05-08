import { useState, useEffect } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Box,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
    IconButton,
    Button,
    Chip,
    FormHelperText
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";

const fieldLabels = {
    position__name__in: "Posición",
    prop__name__in: "Implemento",
    machine__name__in: "Máquina",
    tag__id__in: "Etiqueta",
    group__in: "Grupo",
    box__in: "Caja",
};

const WEEKDAYS = [
    { value: 0, label: "Lunes" },
    { value: 1, label: "Martes" },
    { value: 2, label: "Miércoles" },
    { value: 3, label: "Jueves" },
    { value: 4, label: "Viernes" },
    { value: 5, label: "Sábado" },
    { value: 6, label: "Domingo" }
];

export default function AddSessionSeriesDialog({
    open,
    onClose,
    onConfirm,
    centerId,
    options,
    routineFilters,
    setRoutineFilters,
    routinesToShow
}) {
    const [seriesData, setSeriesData] = useState({
        name: "",
        weekdays: [],
        duration: 60,
        start_date: "",
        end_date: "",
        time: "",
        room_id: "",
        routine_id: null,
        user_id: ""
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!open) {
            // Resetear al cerrar
            setSeriesData({
                name: "",
                weekdays: [],
                duration: 60,
                start_date: "",
                end_date: "",
                time: "",
                room_id: "",
                routine_id: null,
                user_id: ""
            });
            setErrors({});
        }
    }, [open]);

    const centerRooms = options.rooms.filter(r => r.center === centerId);

    const handleMultiSelectChange = (event) => {
        const { name, value } = event.target;
        setRoutineFilters({ ...routineFilters, [name]: value.length ? value : [] });
    };

    const clearFilter = (field) => {
        setRoutineFilters({ ...routineFilters, [field]: [] });
    };

    const clearAllFilters = () => {
        const cleared = Object.fromEntries(Object.keys(routineFilters).map((key) => [key, []]));
        setRoutineFilters(cleared);
    };

    const handleWeekdayToggle = (dayValue) => {
        setSeriesData(prev => {
            const currentWeekdays = prev.weekdays || [];
            const isSelected = currentWeekdays.includes(dayValue);
            
            return {
                ...prev,
                weekdays: isSelected
                    ? currentWeekdays.filter(d => d !== dayValue)
                    : [...currentWeekdays, dayValue].sort()
            };
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!seriesData.name.trim()) {
            newErrors.name = "El nombre es requerido";
        }

        if (!seriesData.start_date) {
            newErrors.start_date = "La fecha de inicio es requerida";
        }

        if (!seriesData.end_date) {
            newErrors.end_date = "La fecha de fin es requerida";
        }

        if (seriesData.start_date && seriesData.end_date && seriesData.end_date < seriesData.start_date) {
            newErrors.end_date = "La fecha de fin debe ser posterior a la de inicio";
        }

        if (!seriesData.time) {
            newErrors.time = "La hora es requerida";
        }

        if (!seriesData.room_id) {
            newErrors.room_id = "La sala es requerida";
        }

        if (!seriesData.weekdays || seriesData.weekdays.length === 0) {
            newErrors.weekdays = "Selecciona al menos un día de la semana";
        }

        if (!seriesData.duration || seriesData.duration <= 0) {
            newErrors.duration = "La duración debe ser mayor a 0";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirm = () => {
        if (!validateForm()) {
            return;
        }

        // Preparar datos para enviar
        const dataToSend = {
            name: seriesData.name,
            weekdays: seriesData.weekdays,
            duration: parseInt(seriesData.duration),
            start_date: seriesData.start_date,
            end_date: seriesData.end_date,
            time: seriesData.time,
            room_id: seriesData.room_id,
            routine_id: seriesData.routine_id || null,
            user_id: seriesData.user_id || null
        };

        onConfirm(dataToSend);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Programar Serie de Sesiones</DialogTitle>
            <DialogContent>
                {/* Información básica de la serie */}
                <Box mt={2} mb={3} p={2} border="1px solid" borderColor="primary.main" borderRadius={2}>
                    <Typography variant="h6" color="primary" fontWeight="bold" mb={2}>
                        Información de la Serie
                    </Typography>

                    <TextField
                        label="Nombre de la serie"
                        fullWidth
                        value={seriesData.name}
                        onChange={(e) => setSeriesData({ ...seriesData, name: e.target.value })}
                        error={!!errors.name}
                        helperText={errors.name || "Ej: Clases de Pilates - Mañanas"}
                        sx={{ mb: 2 }}
                    />

                    {/* Configuración de días de la semana */}
                    <Box mb={2}>
                        <Typography variant="body2" color="textSecondary" mb={1}>
                            Selecciona los días de la semana:
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {WEEKDAYS.map((day) => (
                                <Chip
                                    key={day.value}
                                    label={day.label}
                                    onClick={() => handleWeekdayToggle(day.value)}
                                    color={seriesData.weekdays?.includes(day.value) ? "primary" : "default"}
                                    variant={seriesData.weekdays?.includes(day.value) ? "filled" : "outlined"}
                                />
                            ))}
                        </Box>
                        {errors.weekdays && (
                            <Typography variant="caption" color="error" display="block" mt={1}>
                                {errors.weekdays}
                            </Typography>
                        )}
                    </Box>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            label="Fecha de inicio"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={seriesData.start_date}
                            onChange={(e) => setSeriesData({ ...seriesData, start_date: e.target.value })}
                            error={!!errors.start_date}
                            helperText={errors.start_date}
                        />
                        <TextField
                            label="Fecha de fin"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={seriesData.end_date}
                            onChange={(e) => setSeriesData({ ...seriesData, end_date: e.target.value })}
                            error={!!errors.end_date}
                            helperText={errors.end_date}
                        />
                    </Box>

                    <TextField
                        label="Hora"
                        type="time"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={seriesData.time}
                        onChange={(e) => setSeriesData({ ...seriesData, time: e.target.value })}
                        error={!!errors.time}
                        helperText={errors.time}
                    />
                </Box>

                {/* Configuración de sesión */}
                <Box mt={2} mb={3} p={2} border="1px solid" borderColor="secondary.main" borderRadius={2}>
                    <Typography variant="h6" color="secondary" fontWeight="bold" mb={2}>
                        Configuración de Sesiones
                    </Typography>

                    <FormControl fullWidth error={!!errors.room_id} sx={{ mb: 2 }}>
                        <InputLabel>Sala</InputLabel>
                        <Select
                            value={seriesData.room_id}
                            onChange={(e) => setSeriesData({ ...seriesData, room_id: e.target.value })}
                        >
                            {centerRooms.map((room) => (
                                <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>
                            ))}
                        </Select>
                        {errors.room_id && <FormHelperText>{errors.room_id}</FormHelperText>}
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Monitor (opcional)</InputLabel>
                        <Select
                            value={seriesData.user_id}
                            onChange={(e) => setSeriesData({ ...seriesData, user_id: e.target.value })}
                        >
                            <MenuItem value="">Sin asignar</MenuItem>
                            {options.users.map((user) => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Buscar y seleccionar clase (opcional) */}
                <Box mt={2} mb={1} p={2} border="1px solid" borderColor="grey.400" borderRadius={2}>
                    <Typography variant="h6" color="textSecondary" fontWeight="bold" mb={1}>
                        Buscar clase (opcional)
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                        Puedes dejar la clase sin asignar y configurarla después
                    </Typography>

                    <Grid container spacing={2} mt={0}>
                        {Object.keys(fieldLabels).map((field) => {
                            const isTagField = field === "tag__id__in";
                            const optionKey = isTagField ? "tags" : field.replace("__name__in", "s");
                            return (
                                <Grid item xs={12} sm={6} md={4} key={field}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>{fieldLabels[field]}</InputLabel>
                                        <Select
                                            multiple
                                            name={field}
                                            value={routineFilters[field] || []}
                                            onChange={handleMultiSelectChange}
                                            renderValue={(selected) => {
                                                if (isTagField) {
                                                    const selectedNames = options.tags
                                                        .filter((tag) => selected.includes(tag.id))
                                                        .map((tag) => tag.name);
                                                    return selectedNames.join(", ");
                                                }
                                                return selected.join(", ");
                                            }}
                                            endAdornment={
                                                routineFilters[field]?.length > 0 && (
                                                    <IconButton size="small" onClick={() => clearFilter(field)}>
                                                        <ClearIcon fontSize="small" />
                                                    </IconButton>
                                                )
                                            }
                                        >
                                            {(options[optionKey] || []).map((item) => (
                                                <MenuItem key={`${field}-${item.id ?? item}`} value={isTagField ? item.id : item.name || item}>
                                                    <Checkbox checked={routineFilters[field]?.includes(isTagField ? item.id : item.name || item)} />
                                                    <ListItemText primary={item.name || item} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            );
                        })}
                    </Grid>

                    <Box mt={3}>
                        <FormControl fullWidth>
                            <InputLabel>Seleccionar clase</InputLabel>
                            <Select
                                value={seriesData.routine_id || ""}
                                onChange={(e) => {
                                    const selectedRoutineId = e.target.value;
                                    const selectedRoutine = routinesToShow.find(r => r.id === selectedRoutineId);
                                    
                                    setSeriesData({ 
                                        ...seriesData, 
                                        routine_id: selectedRoutineId,
                                        // Auto-rellenar duration con el de la routine si existe
                                        duration: selectedRoutine?.duration || seriesData.duration
                                    });
                                }}
                            >
                                <MenuItem value="">Sin clase asignada</MenuItem>
                                {routinesToShow.map((r) => (
                                    <MenuItem key={r.id} value={r.id}>{r.name} ({r.duration} min)</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Box mt={2} textAlign="right">
                        <Button variant="text" color="secondary" onClick={clearAllFilters} size="small">
                            Limpiar filtros
                        </Button>
                    </Box>

                    {/* Duración - se auto-rellena al seleccionar clase pero es editable */}
                    <TextField
                        label="Duración (minutos)"
                        type="number"
                        fullWidth
                        value={seriesData.duration}
                        onChange={(e) => setSeriesData({ ...seriesData, duration: e.target.value })}
                        error={!!errors.duration}
                        helperText={errors.duration || "Se auto-rellena al seleccionar clase, pero puedes modificarlo"}
                        sx={{ mt: 2 }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleConfirm} color="primary" variant="contained">
                    Crear Serie
                </Button>
            </DialogActions>
        </Dialog>
    );
}

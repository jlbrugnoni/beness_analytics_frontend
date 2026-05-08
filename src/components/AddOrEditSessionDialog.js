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
    FormControlLabel,
    Alert
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { useState, useEffect } from "react";

const fieldLabels = {
    position__name__in: "Posición",
    prop__name__in: "Implemento",
    machine__name__in: "Máquina",
    tag__id__in: "Etiqueta",
    group__in: "Grupo",
    box__in: "Caja",
};

export default function AddSessionDialog({
    open,
    onClose,
    onConfirm,
    sessionData,
    setSessionData,
    filters,
    setFilters,
    routinesToShow,
    options,
    isEdit = false,
    sessionId = null,
    sessionSeriesId = null,
    sessionSeriesName = null
}) {
    const [applyToSeries, setApplyToSeries] = useState(false);

    // Resetear el checkbox cada vez que se abre el modal
    useEffect(() => {
        if (open) {
            setApplyToSeries(false);
        }
    }, [open]);

    const handleMultiSelectChange = (event) => {
        const { name, value } = event.target;
        setFilters({ ...filters, [name]: value.length ? value : [] });
    };

    const clearFilter = (field) => {
        setFilters({ ...filters, [field]: [] });
    };

    const clearAllFilters = () => {
        const cleared = Object.fromEntries(Object.keys(filters).map((key) => [key, []]));
        setFilters(cleared);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth={false} PaperProps={{ sx: { width: "90%", maxWidth: 800 } }}>
            <DialogTitle>{isEdit ? "Editar sesión" : "Programar sesión"}</DialogTitle>
            <DialogContent>
                {/* Alerta si la sesión pertenece a una serie */}
                {isEdit && sessionSeriesId && (
                    <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                        Esta sesión pertenece a la serie: <strong>{sessionSeriesName}</strong>
                    </Alert>
                )}

                {/* Configuración de la sesión */}
                <Box mt={2} mb={1} p={2} border="1px solid" borderColor="primary.main" borderRadius={2}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                        Configuración de la sesión
                    </Typography>

                    <TextField
                        label="Nombre de la sesión (opcional)"
                        fullWidth
                        value={sessionData.name || ""}
                        onChange={(e) => setSessionData({ ...sessionData, name: e.target.value })}
                        helperText="Ej: Sesión pilates sala 1"
                        sx={{ mt: 2, mb: 2 }}
                    />

                    <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
                        <FormControl fullWidth>
                            <InputLabel>Centro</InputLabel>
                            <Select
                                value={sessionData.center_id || ""}
                                onChange={(e) => setSessionData({ ...sessionData, center_id: e.target.value, room_id: "" })}
                            >
                                {options.centers.map((center) => (
                                    <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Sala</InputLabel>
                            <Select
                                value={sessionData.room_id || ""}
                                onChange={(e) => setSessionData({ ...sessionData, room_id: e.target.value })}
                            >
                                {options.rooms
                                    .filter(r => !sessionData.center_id || r.center === sessionData.center_id)
                                    .map((room) => (
                                        <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2} mt={2}>
                        <FormControl fullWidth>
                            <InputLabel>Monitor</InputLabel>
                            <Select
                                value={sessionData.user_id || ""}
                                onChange={(e) => setSessionData({ ...sessionData, user_id: e.target.value })}
                            >
                                {options.users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>{user.first_name} {user.last_name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Fecha y hora"
                            type="datetime-local"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={sessionData.scheduled_at}
                            onChange={(e) => setSessionData({ ...sessionData, scheduled_at: e.target.value })}
                        />
                    </Box>

                </Box>

                {/* Buscar y seleccionar clase */}
                <Box mt={2} mb={1} p={2} border="1px solid" borderColor="primary.main" borderRadius={2}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                        Buscar clase (opcional)
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                        Puedes dejar la clase sin asignar
                    </Typography>

                    <Grid container spacing={2} mt={0}>
                        {Object.keys(fieldLabels).map((field) => {
                            const isTagField = field === "tag__id__in";
                            const optionKey = isTagField ? "tags" : field.replace("__name__in", "s");
                            return (
                                <Grid item xs={12} sm={6} md={4} key={field}>
                                    <FormControl fullWidth>
                                        <InputLabel>{fieldLabels[field]}</InputLabel>
                                        <Select
                                            multiple
                                            name={field}
                                            value={filters[field] || []}
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
                                                filters[field]?.length > 0 && (
                                                    <IconButton size="small" onClick={() => clearFilter(field)}>
                                                        <ClearIcon fontSize="small" />
                                                    </IconButton>
                                                )
                                            }
                                        >
                                            {(options[optionKey] || []).map((item) => (
                                                <MenuItem key={`${field}-${item.id ?? item}`} value={isTagField ? item.id : item.name || item}>
                                                    <Checkbox checked={filters[field]?.includes(isTagField ? item.id : item.name || item)} />
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
                            <InputLabel>Seleccionar clase (opcional)</InputLabel>
                            <Select
                                value={sessionData.routine_id || ""}
                                onChange={(e) => {
                                    const selectedRoutineId = e.target.value;
                                    const selectedRoutine = routinesToShow.find(r => r.id === selectedRoutineId);
                                    
                                    setSessionData({ 
                                        ...sessionData, 
                                        routine_id: selectedRoutineId,
                                        // Auto-rellenar duration con el de la routine si existe
                                        duration: selectedRoutine?.duration || sessionData.duration
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

                    <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2} mt={2}>
                        <TextField
                            label="Duración (minutos)"
                            type="number"
                            fullWidth
                            value={sessionData.duration || 60}
                            onChange={(e) => setSessionData({ ...sessionData, duration: e.target.value })}
                            helperText="Duración de la sesión en minutos"
                        />
                    </Box>

                    <Box mt={2} textAlign="right">
                        <Button variant="text" color="secondary" onClick={clearAllFilters}>
                            Limpiar todos los filtros
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: 3, pb: 2 }}>
                {/* Checkbox para aplicar a toda la serie */}
                {isEdit && sessionSeriesId && (
                    <FormControlLabel
                        control={
                            <Checkbox 
                                checked={applyToSeries}
                                onChange={(e) => setApplyToSeries(e.target.checked)}
                                color="secondary"
                            />
                        }
                        label={
                            <Typography variant="body2">
                                Aplicar cambios a sesiones futuras de la serie (excepto clase y fecha)
                            </Typography>
                        }
                    />
                )}
                
                <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button 
                        onClick={() => onConfirm(applyToSeries)} 
                        color="primary" 
                        disabled={!sessionData.scheduled_at || !sessionData.room_id}
                    >
                        {isEdit ? "Guardar cambios" : "Programar"}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}

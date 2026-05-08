import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
    TextField,
    Typography,
} from "@mui/material";

function formatDateForInput(date) {
    if (!date) return "";
    if (typeof date === "string") return date;

    const localDate = new Date(date);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function DailyRoutineAssignmentDialog({
    open,
    onClose,
    onConfirm,
    centerName,
    selectedDate,
    rooms,
    routines,
    loading = false,
    initialRoomIds = [],
    defaultMode = "all",
}) {
    const [assignmentDate, setAssignmentDate] = useState("");
    const [routineId, setRoutineId] = useState("");
    const [roomIds, setRoomIds] = useState([]);
    const [assignmentMode, setAssignmentMode] = useState("all");
    const [overwriteManual, setOverwriteManual] = useState(false);

    useEffect(() => {
        if (!open) return;

        const availableRoomIds = rooms.map((room) => room.id);
        const preferredRoomIds = initialRoomIds.length > 0 ? initialRoomIds : availableRoomIds;
        const resolvedMode = defaultMode === "rooms" ? "rooms" : "all";

        setAssignmentDate(formatDateForInput(selectedDate));
        setRoutineId("");
        setAssignmentMode(resolvedMode);
        setRoomIds(preferredRoomIds);
        setOverwriteManual(false);
    }, [open, selectedDate, rooms, initialRoomIds, defaultMode]);

    const effectiveRoomIds = useMemo(() => {
        if (assignmentMode === "all") {
            return rooms.map((room) => room.id);
        }
        return roomIds;
    }, [assignmentMode, roomIds, rooms]);

    const handleConfirm = () => {
        onConfirm({
            date: assignmentDate,
            routine_id: routineId,
            room_ids: effectiveRoomIds,
            overwrite_manual: overwriteManual,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Asignar clase del día</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    Centro: <strong>{centerName || "Sin centro"}</strong>
                </Typography>

                <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                        label="Fecha"
                        type="date"
                        value={assignmentDate}
                        onChange={(event) => setAssignmentDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />

                    <FormControl fullWidth>
                        <InputLabel>Clase</InputLabel>
                        <Select
                            value={routineId}
                            label="Clase"
                            onChange={(event) => setRoutineId(event.target.value)}
                        >
                            {routines.map((routine) => (
                                <MenuItem key={routine.id} value={routine.id}>
                                    {routine.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Aplicar la clase a
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            value={assignmentMode}
                            onChange={(_, nextValue) => {
                                if (!nextValue) return;
                                setAssignmentMode(nextValue);
                            }}
                            size="small"
                        >
                            <ToggleButton value="all">Todas las salas</ToggleButton>
                            <ToggleButton value="rooms">Salas específicas</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {assignmentMode === "all" ? (
                        <Alert severity="info">
                            Se aplicará a todas las salas del centro ({rooms.length} sala(s)).
                        </Alert>
                    ) : (
                        <FormControl fullWidth>
                            <InputLabel>Salas</InputLabel>
                            <Select
                                multiple
                                value={roomIds}
                                label="Salas"
                                onChange={(event) => setRoomIds(event.target.value)}
                                renderValue={(selected) =>
                                    rooms
                                        .filter((room) => selected.includes(room.id))
                                        .map((room) => room.name)
                                        .join(", ")
                                }
                            >
                                {rooms.map((room) => (
                                    <MenuItem key={room.id} value={room.id}>
                                        <Checkbox checked={roomIds.includes(room.id)} />
                                        <ListItemText primary={room.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ px: 1, py: 0.5, border: "1px solid #ddd", borderRadius: 1 }}
                    >
                        <Box>
                            <Typography variant="body2">Sobrescribir cambios manuales</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Si está desactivado, las sesiones cambiadas manualmente se conservan.
                            </Typography>
                        </Box>
                        <Switch
                            checked={overwriteManual}
                            onChange={(event) => setOverwriteManual(event.target.checked)}
                        />
                    </Box>

                    <Alert severity="info">
                        Se actualizarán {effectiveRoomIds.length} sala(s) para el día seleccionado.
                    </Alert>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!assignmentDate || !routineId || effectiveRoomIds.length === 0 || loading}
                >
                    Aplicar clase
                </Button>
            </DialogActions>
        </Dialog>
    );
}

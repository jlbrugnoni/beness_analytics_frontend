import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
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

export default function GeneralRoutineAssignmentDialog({
    open,
    onClose,
    onConfirm,
    selectedDate,
    routines,
    centersCount = 0,
    roomsCount = 0,
    loading = false,
}) {
    const [assignmentDate, setAssignmentDate] = useState("");
    const [routineId, setRoutineId] = useState("");
    const [overwriteRoomOverrides, setOverwriteRoomOverrides] = useState(false);
    const [overwriteManual, setOverwriteManual] = useState(false);
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open) return;
        setAssignmentDate(formatDateForInput(selectedDate));
        setRoutineId("");
        setOverwriteRoomOverrides(false);
        setOverwriteManual(false);
        setNotes("");
    }, [open, selectedDate]);

    const handleConfirm = () => {
        onConfirm({
            date: assignmentDate,
            routine_id: routineId,
            overwrite_room_overrides: overwriteRoomOverrides,
            overwrite_manual: overwriteManual,
            notes,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Asignar clase general</DialogTitle>
            <DialogContent>
                <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
                    <Alert severity="info">
                        Esta acción aplicará la clase seleccionada a todas las salas de todos los centros.
                    </Alert>

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

                    <TextField
                        label="Notas"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                    />

                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ px: 1, py: 0.75, border: "1px solid #ddd", borderRadius: 1 }}
                    >
                        <Box>
                            <Typography variant="body2">Sobrescribir cambios de salas</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Si está desactivado, las salas con una clase distinta se conservan.
                            </Typography>
                        </Box>
                        <Switch
                            checked={overwriteRoomOverrides}
                            onChange={(event) => setOverwriteRoomOverrides(event.target.checked)}
                        />
                    </Box>

                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ px: 1, py: 0.75, border: "1px solid #ddd", borderRadius: 1 }}
                    >
                        <Box>
                            <Typography variant="body2">Sobrescribir cambios manuales de sesiones</Typography>
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
                        Se aplicará a {centersCount} centro(s) y {roomsCount} sala(s).
                    </Alert>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!assignmentDate || !routineId || loading}
                >
                    Aplicar clase general
                </Button>
            </DialogActions>
        </Dialog>
    );
}

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";

const SPRING_LAYOUT = {
    tower: ["yellow", "blue", "green"],
    car: ["yellow", "blue", "green", "red1", "red2"],
};

const SPRING_ICON_COLOR = {
    yellow: "yellow",
    blue: "blue",
    green: "green",
    red1: "red",
    red2: "red",
};

function getSpringIconPath(springName, isSelected) {
    const normalizedColor = SPRING_ICON_COLOR[springName];
    if (!normalizedColor) return null;

    return `/images/springs/${normalizedColor}_${isSelected ? "selected" : "unselected"}.png`;
}

function renderSpringGroup(springs = [], springType) {
    const title = springType === "tower" ? "Resortes de torre" : "Resortes de carro";
    const configuredSprings = new Set(
        springs
            .filter((item) => item.spring?.spring_type === springType)
            .map((item) => item.spring?.name)
            .filter(Boolean)
    );
    const layout = SPRING_LAYOUT[springType] || [];

    return (
        <Box mb={1.5}>
            <Typography variant="subtitle2" gutterBottom align="center">
                {title}
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.25,
                    flexWrap: "wrap",
                }}
            >
                {layout.map((springName, index) => {
                    const iconPath = getSpringIconPath(springName, configuredSprings.has(springName));
                    const label = `${springType}-${springName}-${configuredSprings.has(springName) ? "selected" : "unselected"}`;

                    if (!iconPath) {
                        return null;
                    }

                    return (
                        <Box
                            key={`${label}-${index}`}
                            component="img"
                            src={iconPath}
                            alt={label}
                            sx={{
                                width: 36,
                                height: 36,
                                objectFit: "contain",
                                display: "block",
                            }}
                        />
                    );
                })}
            </Box>
        </Box>
    );
}

export default function RoutineExerciseDetailsDialog({ open, onClose, routineExercise }) {
    const exercise = routineExercise?.exercise;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{exercise?.name || "Detalle del ejercicio"}</DialogTitle>
            <DialogContent dividers>
                {routineExercise && exercise ? (
                    <Box>
                        {exercise.image ? (
                            <Box
                                component="img"
                                src={exercise.image}
                                alt={exercise.name}
                                sx={{
                                    width: "80%",
                                    maxWidth: "100%",
                                    maxHeight: 520,
                                    display: "block",
                                    margin: "0 auto 24px",
                                    objectFit: "contain",
                                    borderRadius: 2,
                                }}
                            />
                        ) : null}

                        <Box
                            sx={{
                                width: "80%",
                                maxWidth: "100%",
                                margin: "0 auto 24px",
                                textAlign: "center",
                            }}
                        >
                            {renderSpringGroup(exercise.springs || [], "tower")}
                            {renderSpringGroup(exercise.springs || [], "car")}
                        </Box>

                        <Box mb={3}>
                            <Typography variant="h6" gutterBottom>
                                Información en la rutina
                            </Typography>
                            <Typography variant="body2">
                                <strong>Repeticiones:</strong> {routineExercise.repetitions ?? "No especificadas"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Duración:</strong> {routineExercise.duration_seconds ? `${routineExercise.duration_seconds} segundos` : "No especificada"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Orden:</strong> {routineExercise.order ?? "No especificado"}
                            </Typography>
                            {routineExercise.comment ? (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Comentario:</strong> {routineExercise.comment}
                                </Typography>
                            ) : null}
                        </Box>

                        <Box mb={3}>
                            <Typography variant="h6" gutterBottom>
                                Datos del ejercicio
                            </Typography>
                            <Typography variant="body2">
                                <strong>Posición:</strong> {exercise.position || "No especificada"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Máquina:</strong> {exercise.machine || "No especificada"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Implemento:</strong> {exercise.prop || "No especificado"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Grupo:</strong> {exercise.group || "No especificado"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Caja:</strong> {exercise.box || "No"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Mirada:</strong> {exercise.head_position || "No especificada"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Unilateral:</strong> {exercise.unilateral ? "Sí" : "No"}
                            </Typography>
                        </Box>

                        {exercise.description ? (
                            <Box mb={3}>
                                <Typography variant="h6" gutterBottom>
                                    Descripción
                                </Typography>
                                <Typography variant="body2">{exercise.description}</Typography>
                            </Box>
                        ) : null}

                        {exercise.instructions ? (
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Instrucciones
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                                    {exercise.instructions}
                                </Typography>
                            </Box>
                        ) : null}
                    </Box>
                ) : (
                    <Typography variant="body2">No hay información disponible para este ejercicio.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}

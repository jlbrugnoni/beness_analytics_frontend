import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Grid,
} from "@mui/material";
import axios from "axios";
import RoutineExerciseDetailsDialog from "@/components/RoutineExerciseDetailsDialog";

/*
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

function renderSpringRow(springs = [], springType) {
    const configuredSprings = new Set(
        springs
            .filter((item) => item.spring?.spring_type === springType)
            .map((item) => item.spring?.name)
            .filter(Boolean)
    );

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                flexWrap: "wrap",
            }}
        >
            {SPRING_LAYOUT[springType].map((springName, index) => {
                const iconPath = getSpringIconPath(springName, configuredSprings.has(springName));
                if (!iconPath) return null;

                return (
                    <img
                        key={`${springType}-${springName}-${index}`}
                        src={iconPath}
                        alt=""
                        aria-hidden="true"
                        style={{
                            width: 20,
                            height: 20,
                            objectFit: "contain",
                            display: "block",
                        }}
                    />
                );
            })}
        </div>
    );
}
*/

export default function RoutineSummaryDialog({ open, onClose, routineId, token, backendUrl }) {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    useEffect(() => {
        if (open && routineId) {
            setLoading(true);
            axios
                .get(`${backendUrl}/api/data/routines/${routineId}/`, {
                    headers: { Authorization: `Token ${token}` },
                })
                .then((res) => {
                    const ordered = (res.data.routine_exercises || []).sort((a, b) => a.order - b.order);
                    setExercises(ordered);
                })
                .catch((err) => {
                    console.error("Error fetching routine summary:", err);
                    setExercises([]);
                })
                .finally(() => setLoading(false));
        }
    }, [open, routineId]);

    const handleExerciseClick = (ex) => {
        setSelectedExercise(ex);
        setDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedExercise(null);
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>Resumen de ejercicios</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <CircularProgress />
                    ) : exercises.length === 0 ? (
                        <Typography>No hay ejercicios definidos para esta clase.</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {exercises.map((ex, idx) => (
                                <Grid item xs={12} sm={6} md={4} key={idx}>
                                    <div
                                        onClick={() => handleExerciseClick(ex)}
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: 10,
                                            borderRadius: 8,
                                            minHeight: 200,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                                            e.currentTarget.style.transform = "translateY(-2px)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = "none";
                                            e.currentTarget.style.transform = "translateY(0)";
                                        }}
                                    >
                                        <img
                                            src={ex.exercise.image}
                                            alt={ex.exercise.name}
                                            style={{
                                                width: "100%",
                                                borderRadius: 4,
                                                objectFit: "cover",
                                                height: 140,
                                                marginBottom: 10,
                                            }}
                                        />
                                        <Typography variant="subtitle1">
                                            <strong>{ex.order}. {ex.exercise.name}</strong>
                                        </Typography>
                                        <Typography variant="body2">
                                            Rep. {ex.repetitions ?? "-"} | Dur. {ex.duration_seconds ? `${ex.duration_seconds} seg` : "-"}
                                        </Typography>
                                        {ex.comment && (
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    color: '#666',
                                                    fontStyle: 'italic',
                                                    display: 'block',
                                                    mt: 0.5
                                                }}
                                            >
                                                💬 {ex.comment}
                                            </Typography>
                                        )}
                                        {/* Spring icons for summary cards kept here for later reuse.
                                        <div
                                            style={{
                                                marginTop: 10,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 6,
                                            }}
                                        >
                                            {renderSpringRow(ex.exercise.springs || [], "tower")}
                                            {renderSpringRow(ex.exercise.springs || [], "car")}
                                        </div>
                                        */}
                                    </div>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cerrar</Button>
                </DialogActions>
            </Dialog>
            <RoutineExerciseDetailsDialog
                open={detailsOpen}
                onClose={handleCloseDetails}
                routineExercise={selectedExercise}
            />
        </>
    );
}

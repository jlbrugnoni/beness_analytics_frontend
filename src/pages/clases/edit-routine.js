import MainPage from "@/pages/mainPage";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import styles from "@/styles/routineEditPage.module.css";

import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import useFetchToken from "@/components/useFetchUserId";
import Head from "next/head";
import usePermissions from "@/hooks/usePermissions";

import { IconButton, Button } from "@mui/material";
import AddExerciseCardsDialog from "@/components/AddExerciseCardsDialog";
import RoutineExerciseDetailsDialog from "@/components/RoutineExerciseDetailsDialog";

import { ReactSortable } from "react-sortablejs";

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
        <div className={styles.springRow}>
            {SPRING_LAYOUT[springType].map((springName, index) => {
                const iconPath = getSpringIconPath(springName, configuredSprings.has(springName));
                if (!iconPath) return null;

                return (
                    <img
                        key={`${springType}-${springName}-${index}`}
                        src={iconPath}
                        alt=""
                        aria-hidden="true"
                        className={styles.springIcon}
                    />
                );
            })}
        </div>
    );
}



export default function EditRoutineExercises() {
    const EXERCISES_PAGE_SIZE = 20;
    const router = useRouter();
    const { id } = router.query;
    const [exercises, setExercises] = useState([]);
    const [exercisesToAdd, setExercisesToAdd] = useState([]);
    const [exerciseResultsCount, setExerciseResultsCount] = useState(0);
    const [exercisePage, setExercisePage] = useState(1);
    const [hasMoreExercises, setHasMoreExercises] = useState(true);
    const [loadingMoreExercises, setLoadingMoreExercises] = useState(false);
    const [isLoadingExercisesToAdd, setIsLoadingExercisesToAdd] = useState(false);
    const [loading, setLoading] = useState(true);

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRoutineExercise, setSelectedRoutineExercise] = useState(null);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [repetitions, setRepetitions] = useState("");
    const [duration, setDuration] = useState("");
    const [comment, setComment] = useState("");
    const [nameSearch, setNameSearch] = useState("");

    const [filters, setFilters] = useState({
        position__name__in: [],
        prop__name__in: [],
        machine__name__in: [],
        tag__id__in: [],
        group__in: [],
        box__in: [],
        head_position__in: [],
        unilateral: ""
    });
    const [options, setOptions] = useState({
        positions: [],
        props: [],
        machines: [],
        tags: [],
        group__in: ["Piernas", "Tronco", "Brazos"],
        box__in: ["No", "Larga", "Corta"],
        head_position__in: ["Torre", "Lateral", "Barra"]
    });
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const token = useFetchToken();
    const permissions = usePermissions();
    useEffect(() => {
        if (!id) return;
        fetchExercises();
    }, [id]);

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    const fetchExercises = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/routines/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            const updatedExercises = response.data.routine_exercises.map((item, index) => ({
                id_on_routine: item.id_on_routine,
                id: item.exercise.id,
                name: item.exercise.name,
                thumbnail: item.exercise.image,
                video: item.exercise.video,
                exercise: item.exercise,
                repetitions: item.repetitions,
                duration_seconds: item.duration_seconds,
                comment: item.comment,
                order: item.order ?? index + 1
            }));
            setExercises(updatedExercises);
        } catch (error) {
            console.error("Error fetching exercises:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!addDialogOpen) return;

        setSelectedExercise(null);

        // Reuse the already loaded list when reopening the dialog with the same filters.
        if (exercisesToAdd.length > 0) {
            return;
        }

        setExercisePage(1);
        setHasMoreExercises(true);
        fetchExercisesToAdd(1, true);
    }, [addDialogOpen]);

    useEffect(() => {
        if (!addDialogOpen) return;

        setExercisePage(1);
        setHasMoreExercises(true);
        setSelectedExercise(null);
        fetchExercisesToAdd(1, true);
    }, [filters, nameSearch]);

    useEffect(() => {
        if (!addDialogOpen) return;
        if (exercisePage === 1) return;
        fetchExercisesToAdd(exercisePage, exercisePage === 1);
    }, [exercisePage, addDialogOpen]);

    const fetchExercisesToAdd = async (pageToLoad = 1, replaceResults = false) => {
        setIsLoadingExercisesToAdd(true);
        setLoadingMoreExercises(true);
        try {
            const formattedFilters = {
                ...filters,
                position__name__in: filters.position__name__in.length ? filters.position__name__in.join(",") : undefined,
                prop__name__in: filters.prop__name__in.length ? filters.prop__name__in.join(",") : undefined,
                machine__name__in: filters.machine__name__in.length ? filters.machine__name__in.join(",") : undefined,
                tag__id__in: filters.tag__id__in.length ? filters.tag__id__in.join(",") : undefined,
                group__in: filters.group__in.length ? filters.group__in.join(",") : undefined,
                box__in: filters.box__in.length ? filters.box__in.join(",") : undefined,
                head_position__in: filters.head_position__in.length ? filters.head_position__in.join(",") : undefined,
                name__icontains: nameSearch || undefined,
                page: pageToLoad,
                page_size: EXERCISES_PAGE_SIZE
            };

            const response = await axios.get(`${backendUrl}/api/data/exercises/`, {
                headers: { Authorization: `Token ${token}` },
                params: formattedFilters
            });

            const newResults = response.data.results || [];
            setExerciseResultsCount(response.data.count || 0);
            setHasMoreExercises(Boolean(response.data.next));
            setExercisesToAdd((prev) => {
                if (replaceResults) {
                    return newResults;
                }

                const seenIds = new Set(prev.map((exercise) => exercise.id));
                const mergedResults = [...prev];
                newResults.forEach((exercise) => {
                    if (!seenIds.has(exercise.id)) {
                        mergedResults.push(exercise);
                    }
                });
                return mergedResults;
            });
        } catch (error) {
            console.error("Error fetching exercises:", error);
            if (replaceResults) {
                setExercisesToAdd([]);
                setSelectedExercise(null);
            }
            setHasMoreExercises(false);
        } finally {
            setLoadingMoreExercises(false);
            setIsLoadingExercisesToAdd(false);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const [positionsRes, propsRes, machinesRes, tagsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/data/all_positions/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_props/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_machines/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_tags/`, { headers: { Authorization: `Token ${token}` } })
            ]);
            setOptions({
                positions: positionsRes.data || [],
                props: propsRes.data || [],
                machines: machinesRes.data || [],
                tags: tagsRes.data || [],
                group__in: ["Piernas", "Tronco", "Brazos"],
                box__in: ["No", "Larga", "Corta"],
                head_position__in: ["Torre", "Lateral", "Barra"]
            });
        } catch (error) {
            console.error("Error fetching filter options:", error);
        }
    };

    const handleMultiSelectChange = (event) => {
        const { name, value } = event.target;
        setFilters({ ...filters, [name]: value.length ? value : [] });
    };
    const clearFilter = (field) => {
        setFilters({ ...filters, [field]: [] });
    };
    const clearAllFilters = () => {
        const clearedFilters = Object.fromEntries(
            Object.keys(filters).map((key) => [key, []])
        );
        setFilters(clearedFilters);
    };

    const deleteExercise = async (exerciseId) => {
        try {
            await axios.post(`${backendUrl}/api/data/routines/${id}/remove_exercise/`, { routine_exercise_id: exerciseId }, {
                headers: { Authorization: `Token ${token}` },
            });

            fetchExercises(); // Reload exercises after deletion
        } catch (error) {
            console.error("Error deleting exercise:", error);
        }
        router.reload();
    };

    const saveOrder = async () => {
        const newOrder = exercises.map((ex, index) => ({
            id_on_routine: ex.id_on_routine,
            order: index,
        }));

        try {
            await axios.post(`${backendUrl}/api/data/routines_reorder_exercises/`, {
                routine_id: id,
                exercises: newOrder,
            }, {
                headers: { Authorization: `Token ${token}` }
            });

            await fetchExercises();
            alert("Orden guardado correctamente");
        } catch (error) {
            console.error("Error al guardar el orden:", error);
            alert("Hubo un error al guardar el orden.");
        }
    };

    const handleOpenAddModal = async () => {
        setRepetitions("");
        setDuration("");
        setComment("");
        setSelectedExercise(null);
        setAddDialogOpen(true);
    };

    const handleLoadMoreExercises = () => {
        if (loadingMoreExercises || !hasMoreExercises) return;
        setExercisePage((prevPage) => prevPage + 1);
    };

    const handleConfirmAdd = async () => {
        console.log("seleccionado " + selectedExercise);
        if (!selectedExercise) {
            alert("Seleccione un ejercicio.");
            return false;
        }

        try {
            await axios.post(
                `${backendUrl}/api/data/routines/${id}/add_exercise/`,
                {
                    exercise_id: selectedExercise,
                    repetitions: repetitions || null,
                    duration_seconds: duration || null,
                    comment: comment || null,
                },
                { headers: { Authorization: `Token ${token}` } }
            );
            fetchExercises();
            setSelectedExercise(null);
            setRepetitions("");
            setDuration("");
            setComment("");
            return true;
        } catch (error) {
            console.error("❌ Error adding exercise to routine:", error);

            let errorMsg = "Hubo un error al agregar el ejercicio.";
            if (error.response) {
                errorMsg = error.response.data.error || errorMsg;
            }

            alert(errorMsg);
            return false;
        }
    };

    const handleOpenDetails = (exercise) => {
        setSelectedRoutineExercise(exercise);
        setDetailsOpen(true);
    };

    if (permissions == null) return null;

    return (
        <MainPage>
            <Head>
                <title>Beness App | Editar Ejercicios de Clase</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Editar ejercicios de clase</h1>
                    {permissions.includes("core_data.change_routine") && (
                        <Button
                            className={styles.addButton}
                            variant="contained"
                            onClick={handleOpenAddModal}
                        >
                            + Añadir ejercicio
                        </Button>
                    )}
                </div>


                {loading ? (
                    <p>Cargando ejercicios...</p>
                ) : (
                    <ReactSortable
                        list={exercises}
                        setList={setExercises}
                        className={styles.exerciseContainer}
                    >
                        {exercises.map((exercise, index) => (
                            <div key={exercise.id_on_routine} className={styles.exerciseCard}>
                                <div className={styles.thumbnailWrapper}>
                                    <img src={exercise.thumbnail} alt={exercise.name} className={styles.thumbnail} />
                                    <span className={styles.orderBadge}>{index + 1}</span>
                                </div>
                                <div className={styles.springsBlock}>
                                    {renderSpringRow(exercise.exercise?.springs || [], "tower")}
                                    {renderSpringRow(exercise.exercise?.springs || [], "car")}
                                </div>
                                <p>{exercise.name}</p>
                                <p>Reps: {exercise.repetitions ?? "-"}</p>
                                <p>Duración: {exercise.duration_seconds ? `${exercise.duration_seconds} seg` : "-"}</p>
                                {exercise.comment && (
                                    <p style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                                        💬 {exercise.comment.substring(0, 70)}{exercise.comment.length > 70 ? '...' : ''}
                                    </p>
                                )}
                                <div className={styles.controls}>
                                    <IconButton
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenDetails(exercise);
                                        }}
                                    >
                                        <InfoOutlinedIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            deleteExercise(exercise.id_on_routine);
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </div>
                            </div>
                        ))}
                    </ReactSortable>
                )}
                <Button variant="contained" onClick={saveOrder} className={styles.saveButton}>
                    Guardar Orden
                </Button>
            </div>
            <AddExerciseCardsDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onConfirm={handleConfirmAdd}
                filters={filters}
                setFilters={setFilters}
                options={options}
                exercisesToAdd={exercisesToAdd}
                exerciseResultsCount={exerciseResultsCount}
                hasMoreExercises={hasMoreExercises}
                loadingMoreExercises={loadingMoreExercises}
                isLoadingExercises={isLoadingExercisesToAdd}
                onLoadMore={handleLoadMoreExercises}
                selectedExercise={selectedExercise}
                setSelectedExercise={setSelectedExercise}
                repetitions={repetitions}
                setRepetitions={setRepetitions}
                duration={duration}
                setDuration={setDuration}
                comment={comment}
                setComment={setComment}
                nameSearch={nameSearch}
                setNameSearch={setNameSearch}
            />
            <RoutineExerciseDetailsDialog
                open={detailsOpen}
                onClose={() => {
                    setDetailsOpen(false);
                    setSelectedRoutineExercise(null);
                }}
                routineExercise={selectedRoutineExercise}
            />
        </MainPage>
    );
}

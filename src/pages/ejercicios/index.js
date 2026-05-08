// Version 3

import MainPage from "@/pages/mainPage";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { MenuItem, FormControl, InputLabel, Grid, Select, Checkbox, ListItemText, IconButton, Button, Box, TextField, Pagination, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip, Typography } from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, InfoOutlined as InfoOutlinedIcon } from "@mui/icons-material";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/FilterTablePage.module.css";
import responsiveStyles from "@/styles/responsive.module.css";;
import cardStyles from "@/styles/ExercisesCardsPage.module.css";
import Head from "next/head";
import usePermissions from "@/hooks/usePermissions";
import { Accordion, AccordionSummary, AccordionDetails, useMediaQuery } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "@mui/material/styles";

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

const fieldLabels = {
    position__name__in: "Posición",
    prop__name__in: "Implemento",
    machine__name__in: "Máquina",
    tag__id__in: "Etiqueta",
    group__in: "Grupo",
    box__in: "Caja",
    head_position__in: "Mirada",
};

const booleanFilters = {
    unilateral: "Unilateral",
    active: "Estado"
};

const EXERCISE_FILTER_STORAGE_KEY = "beness.exerciseFilters";

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
        <div className={cardStyles.springIconsRow}>
            {SPRING_LAYOUT[springType].map((springName, index) => {
                const iconPath = getSpringIconPath(springName, configuredSprings.has(springName));
                if (!iconPath) return null;

                return (
                    <img
                        key={`${springType}-${springName}-${index}`}
                        src={iconPath}
                        alt=""
                        aria-hidden="true"
                        className={cardStyles.springIconImage}
                    />
                );
            })}
        </div>
    );
}

export default function ExercisesTable() {
    const router = useRouter();
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [filters, setFilters] = useState({
        position__name__in: [],
        prop__name__in: [],
        machine__name__in: [],
        tag__id__in: [],
        group__in: [],
        box__in: [],
        head_position__in: [],
        unilateral: "",
        active: "true",
        name__icontains: "", // ✅ Nuevo filtro para búsqueda por nombre
        code__icontains: ""
    });

    // ✅ Estado para el input de búsqueda (valor temporal)
    const [searchInput, setSearchInput] = useState("");
    const [codeSearchInput, setCodeSearchInput] = useState("");

    const [exercises, setExercises] = useState([]);
    const [isLoadingExercises, setIsLoadingExercises] = useState(false);
    const [totalCount, setTotalCount] = useState(0); // ✅ Store total count from API
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15); // ✅ Default matches Django settings
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [selectedRoutine, setSelectedRoutine] = useState("");
    const [routines, setRoutines] = useState([]);
    const [routinesLoading, setRoutinesLoading] = useState(false);
    const [repetitions, setRepetitions] = useState("");
    const [duration, setDuration] = useState("");
    const [comment, setComment] = useState("");
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [detailExercise, setDetailExercise] = useState(null);
    const [videoDialogOpen, setVideoDialogOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [exerciseToDelete, setExerciseToDelete] = useState(null);
    const [filtersRestored, setFiltersRestored] = useState(false);

    const [options, setOptions] = useState({
        positions: [],
        props: [],
        machines: [],
        tags: [],
        group__in: ["Piernas", "Tronco", "Brazos"],
        box__in: ["No", "Larga", "Corta"],
        head_position__in: ["Torre", "Lateral", "Barra"]
    });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const permissions = usePermissions();

    useEffect(() => {
        if (filtersRestored) return;

        try {
            const savedFilters = window.sessionStorage.getItem(EXERCISE_FILTER_STORAGE_KEY);
            if (savedFilters) {
                const parsedFilters = JSON.parse(savedFilters);
                if (parsedFilters.filters) setFilters((current) => ({ ...current, ...parsedFilters.filters }));
                if (typeof parsedFilters.searchInput === "string") setSearchInput(parsedFilters.searchInput);
                if (typeof parsedFilters.codeSearchInput === "string") setCodeSearchInput(parsedFilters.codeSearchInput);
                if (Number.isInteger(parsedFilters.page)) setPage(parsedFilters.page);
                if (Number.isInteger(parsedFilters.rowsPerPage)) setRowsPerPage(parsedFilters.rowsPerPage);
            }
        } catch (error) {
            console.error("Error restoring exercise filters:", error);
        } finally {
            setFiltersRestored(true);
        }
    }, [filtersRestored]);

    useEffect(() => {
        if (!filtersRestored) return;

        try {
            window.sessionStorage.setItem(
                EXERCISE_FILTER_STORAGE_KEY,
                JSON.stringify({
                    filters,
                    searchInput,
                    codeSearchInput,
                    page,
                    rowsPerPage,
                })
            );
        } catch (error) {
            console.error("Error saving exercise filters:", error);
        }
    }, [filtersRestored, filters, searchInput, codeSearchInput, page, rowsPerPage]);

    useEffect(() => {
        if (!filtersRestored) return;
        fetchExercises();
    }, [filtersRestored, filters, page, rowsPerPage]); // ✅ Re-fetch when pagination or filters change

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    // ✅ useEffect para manejar el delay en la búsqueda
    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            setFilters(prevFilters => ({
                ...prevFilters,
                name__icontains: searchInput
            }));
        }, 800);

        return () => clearTimeout(delayedSearch);
    }, [searchInput]);

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            setFilters(prevFilters => ({
                ...prevFilters,
                code__icontains: codeSearchInput
            }));
        }, 800);

        return () => clearTimeout(delayedSearch);
    }, [codeSearchInput]);

    const fetchExercises = async () => {
        setIsLoadingExercises(true);
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
                name__icontains: filters.name__icontains || undefined,
                code__icontains: filters.code__icontains || undefined,
                active: filters.active || undefined,
                page: page + 1,
                page_size: rowsPerPage
            };

            const response = await axios.get(`${backendUrl}/api/data/exercises/`, {
                headers: { Authorization: `Token ${token}` },
                params: formattedFilters
            });

            setExercises(response.data.results || []);
            setTotalCount(response.data.count || 0);
        } catch (error) {
            console.error("Error fetching exercises:", error);
            setExercises([]);
        } finally {
            setIsLoadingExercises(false);
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

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${backendUrl}/api/data/exercises/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            fetchExercises(); // ✅ Refresh data after delete
        } catch (error) {
            console.error("Error deleting exercise:", error);
        }
    };

    const handleOpenDeleteDialog = (exercise) => {
        setExerciseToDelete(exercise);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!exerciseToDelete) return;
        await handleDelete(exerciseToDelete.id);
        setDeleteDialogOpen(false);
        setExerciseToDelete(null);
        if (detailExercise?.id === exerciseToDelete.id) {
            setDetailDialogOpen(false);
            setDetailExercise(null);
        }
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const fetchRoutines = async (forceReload = false) => {
        if (!forceReload && routines.length > 0) return;

        setRoutinesLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/api/data/routines/`, {
                headers: { Authorization: `Token ${token}` },
                params: { on_edit: true }
            });
            setRoutines(response.data.results || []);
        } catch (error) {
            console.error("Error fetching routines:", error);
        } finally {
            setRoutinesLoading(false);
        }
    };

    const handleOpenAddModal = async (exerciseId) => {
        setSelectedExercise(exerciseId);
        setSelectedRoutine("");
        setRepetitions("");
        setDuration("");
        setComment("");
        setAddDialogOpen(true);
        fetchRoutines();
    };

    const handleOpenDetailModal = (exercise) => {
        setDetailExercise(exercise);
        setDetailDialogOpen(true);
    };

    const handleOpenVideoModal = (videoUrl) => {
        setSelectedVideo(videoUrl);
        setVideoDialogOpen(true);
    };

    const springColorMap = {
        yellow: "#e6cf3d",
        blue: "#4f8ed6",
        green: "#54a86b",
        red: "#d95b57",
        red1: "#d95b57",
        red2: "#b93e3b",
    };

    const renderSpringDots = (springs = [], springType) => {
        const filteredSprings = springs.filter((item) => item.spring?.spring_type === springType);

        if (!filteredSprings.length) {
            return <span className={cardStyles.emptyValue}>No configurado</span>;
        }

        return (
            <div className={cardStyles.springDots}>
                {filteredSprings.map((item, index) => {
                    const springName = item.spring?.name || "spring";
                    return (
                        <div key={`${springType}-${springName}-${index}`} className={cardStyles.springItem}>
                            <span
                                className={cardStyles.springDot}
                                style={{ backgroundColor: springColorMap[springName] || "#94a3b8" }}
                                title={springName}
                            />
                            <span className={cardStyles.springText}>{springName}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const handleConfirmAdd = async () => {
        if (!selectedRoutine) {
            alert("Seleccione una rutina.");
            return;
        }

        try {
            await axios.post(
                `${backendUrl}/api/data/routines/${selectedRoutine}/add_exercise/`,
                {
                    exercise_id: selectedExercise,
                    repetitions: repetitions || null,
                    duration_seconds: duration || null,
                    comment: comment || "",
                },
                { headers: { Authorization: `Token ${token}` } }
            );

            alert("Ejercicio agregado correctamente.");
            setAddDialogOpen(false);
        } catch (error) {
            console.error("Error adding exercise to routine:", error);

            let errorMsg = "Hubo un error al agregar el ejercicio.";
            if (error.response) {
                errorMsg = error.response.data.error || errorMsg;
            }

            alert(errorMsg);
        }
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // ✅ Reset to first page when changing page size
    };

    // ✅ Función para limpiar la búsqueda
    const clearSearchFilter = () => {
        setSearchInput("");
        setFilters(prevFilters => ({
            ...prevFilters,
            name__icontains: ""
        }));
    };

    const clearCodeSearchFilter = () => {
        setCodeSearchInput("");
        setFilters(prevFilters => ({
            ...prevFilters,
            code__icontains: ""
        }));
    };

    const renderAdvancedFilters = () => (
        <>
            <Grid container spacing={1} className={styles.filterContainer}>
                {/* ✅ Campo de búsqueda por nombre con estilos consistentes */}
                <Grid item className={styles.filterItem}>
                    <FormControl fullWidth className={styles.formControl}>
                        <TextField
                            label="Buscar por nombre"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            variant="outlined"
                            size="small" // ✅ Añadir size="small" para reducir padding
                            className={`${styles.selectInput} ${responsiveStyles.fullWidthOnMobile}`} // ✅ Múltiples clases
                            InputLabelProps={{
                                className: styles.inputLabel,
                            }}
                            InputProps={{
                                style: {
                                    height: '36px',
                                    padding: '0 14px', // ✅ Padding específico
                                    fontSize: '12px'
                                },
                                endAdornment: searchInput && (
                                    <IconButton 
                                        size="small" 
                                        onClick={clearSearchFilter}
                                        className={styles.clearButton}
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                )
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: '36px',
                                    '& input': {
                                        padding: '8px 14px',
                                        height: '20px',
                                        fontSize: '12px'
                                    }
                                }
                            }}
                        />
                    </FormControl>
                </Grid>

                <Grid item className={styles.filterItem}>
                    <FormControl fullWidth className={styles.formControl}>
                        <TextField
                            label="Buscar por código"
                            value={codeSearchInput}
                            onChange={(e) => setCodeSearchInput(e.target.value)}
                            variant="outlined"
                            size="small"
                            className={`${styles.selectInput} ${responsiveStyles.fullWidthOnMobile}`}
                            InputLabelProps={{
                                className: styles.inputLabel,
                            }}
                            InputProps={{
                                style: {
                                    height: '36px',
                                    padding: '0 14px',
                                    fontSize: '12px'
                                },
                                endAdornment: codeSearchInput && (
                                    <IconButton
                                        size="small"
                                        onClick={clearCodeSearchFilter}
                                        className={styles.clearButton}
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                )
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: '36px',
                                    '& input': {
                                        padding: '8px 14px',
                                        height: '20px',
                                        fontSize: '12px'
                                    }
                                }
                            }}
                        />
                    </FormControl>
                </Grid>

                {/* 🔹 Multi-Select Filters */}
                {Object.keys(fieldLabels).map((field) => {
                    const isTagField = field === "tag__id__in";
                    const optionKey = isTagField ? "tags" : field.replace("__name__in", "s");
                    return (
                        <Grid item key={field} className={styles.filterItem}>
                            <FormControl fullWidth className={styles.formControl}>
                                <InputLabel className={styles.inputLabel}>{fieldLabels[field]}</InputLabel>
                                <Select
                                    multiple
                                    name={field}
                                    value={filters[field]}
                                    onChange={handleMultiSelectChange}
                                    className={styles.selectInput}
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
                                        filters[field].length > 0 && (
                                            <IconButton size="small" onClick={() => clearFilter(field)} className={styles.clearButton}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        )
                                    }
                                >
                                    {(options[optionKey] || []).map((item) => (
                                        <MenuItem
                                            key={item.id || item}
                                            value={isTagField ? item.id : item.name || item}
                                            className={styles.selectInput}
                                        >
                                            <Checkbox checked={filters[field].includes(isTagField ? item.id : item.name || item)} />
                                            <ListItemText primary={item.name || item} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    );
                })}

                {/* 🔹 Boolean Filters */}
                {Object.keys(booleanFilters).map((field) => (
                    <Grid item key={field} className={styles.filterItem}>
                        <FormControl fullWidth className={styles.formControl}>
                            <InputLabel className={styles.inputLabel}>{booleanFilters[field]}</InputLabel>
                            <Select
                                name={field}
                                value={filters[field]}
                                onChange={(e) => setFilters({ ...filters, [field]: e.target.value })}
                                className={styles.selectInput}
                            >
                                {field === "active" ? (
                                    [
                                        <MenuItem key="true" value="true" className={styles.selectInput}>Activos</MenuItem>,
                                        <MenuItem key="false" value="false" className={styles.selectInput}>Inactivos</MenuItem>,
                                        <MenuItem key="all" value="" className={styles.selectInput}>Todos</MenuItem>,
                                    ]
                                ) : (
                                    [
                                        <MenuItem key="all" value="" className={styles.selectInput}>Todas</MenuItem>,
                                        <MenuItem key="true" value="true" className={styles.selectInput}>Sí</MenuItem>,
                                        <MenuItem key="false" value="false" className={styles.selectInput}>No</MenuItem>,
                                    ]
                                )}
                            </Select>
                        </FormControl>
                    </Grid>
                ))}
            </Grid>
        </>
    );

    const renderExerciseCards = () => {
        if (!exercises.length) {
            return (
                <Box className={cardStyles.emptyState}>
                    <h3>No hay ejercicios para mostrar</h3>
                    <p>Probá ajustar o limpiar los filtros para ver más resultados.</p>
                </Box>
            );
        }

        return (
            <Box className={cardStyles.cardsGrid}>
                {exercises.map((exercise) => (
                    <article key={exercise.id} className={cardStyles.card}>
                        <div className={cardStyles.mediaWrapper}>
                            {exercise.image ? (
                                <img
                                    src={exercise.image}
                                    alt={exercise.name}
                                    className={cardStyles.media}
                                />
                            ) : (
                                <div className={cardStyles.mediaFallback}>
                                    Sin imagen
                                </div>
                            )}
                            {typeof exercise.unilateral === "boolean" && (
                                <span className={cardStyles.badge}>
                                    {exercise.unilateral ? "Unilateral" : "Bilateral"}
                                </span>
                            )}
                        </div>

                        <div className={cardStyles.content}>
                            <h3 className={cardStyles.title}>{exercise.name}</h3>

                            <div className={cardStyles.metaGrid}>
                                <div className={cardStyles.metaItem}>
                                    <span className={cardStyles.metaValue}>{exercise.prop || "No especificado"}</span>
                                </div>
                                <div className={cardStyles.metaItem}>
                                    <span className={cardStyles.metaValue}>{exercise.group || "No especificado"}</span>
                                </div>
                            </div>

                            {(exercise.box || exercise.head_position) && (
                                <div className={cardStyles.secondaryRow}>
                                    {exercise.box && (
                                        <span className={cardStyles.secondaryPill}>Caja: {exercise.box}</span>
                                    )}
                                    {exercise.head_position && (
                                        <span className={cardStyles.secondaryPill}>Mirada: {exercise.head_position}</span>
                                    )}
                                </div>
                            )}

                            {exercise.tag_images?.some(Boolean) && (
                                <div className={cardStyles.tagsRow}>
                                    {exercise.tag_images.filter(Boolean).slice(0, 5).map((tagImage, index) => (
                                        <img
                                            key={`${exercise.id}-tag-${index}`}
                                            src={tagImage}
                                            alt={`Tag ${index + 1}`}
                                            className={cardStyles.tagIcon}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className={cardStyles.springIconsBlock}>
                                {renderSpringRow(exercise.springs || [], "tower")}
                                {renderSpringRow(exercise.springs || [], "car")}
                            </div>
                        </div>

                        {(permissions.includes("core_data.change_exercise") || permissions.includes("core_data.delete_exercise")) && (
                            <div className={cardStyles.actions}>
                                <Tooltip title="Ver detalle">
                                    <IconButton
                                        className={cardStyles.actionButton}
                                        aria-label="Ver detalle"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenDetailModal(exercise);
                                        }}
                                    >
                                        <InfoOutlinedIcon fontSize="medium" />
                                    </IconButton>
                                </Tooltip>
                                {exercise.video && (
                                    <Tooltip title="Ver video">
                                        <IconButton
                                            className={cardStyles.actionButton}
                                            aria-label="Ver video"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenVideoModal(exercise.video);
                                            }}
                                        >
                                            <SmartDisplayIcon fontSize="medium" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {permissions.includes("core_data.change_exercise") && (
                                    <Tooltip title="Añadir a clase">
                                        <IconButton
                                            className={cardStyles.actionButton}
                                            aria-label="Añadir a clase"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenAddModal(exercise.id);
                                            }}
                                        >
                                            <AddIcon fontSize="medium" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {permissions.includes("core_data.change_exercise") && (
                                    <Tooltip title="Editar ejercicio">
                                        <IconButton
                                            className={cardStyles.actionButton}
                                            aria-label="Editar ejercicio"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                router.push(`ejercicios/edit?id=${exercise.id}`);
                                            }}
                                        >
                                            <EditIcon fontSize="medium" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {permissions.includes("core_data.delete_exercise") && (
                                    <Tooltip title="Eliminar ejercicio">
                                        <IconButton
                                            className={`${cardStyles.actionButton} ${cardStyles.deleteAction}`}
                                            aria-label="Eliminar ejercicio"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenDeleteDialog(exercise);
                                            }}
                                        >
                                            <DeleteIcon fontSize="medium" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </div>
                        )}
                    </article>
                ))}
            </Box>
        );
    };


    if (permissions == null) return null;
    return (
        <MainPage>
            <Head>
                <title>Beness App | Ejercicios</title>
            </Head>
            {/* 🔥 Header Section with Title and Add Button */}
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>Ejercicios</h1>
                {permissions.includes("core_data.add_exercise") &&
                    <Button className={styles.addButton} onClick={() => router.push("ejercicios/add")}>
                        + Añadir
                    </Button>
                }
            </div>

            {isMobile ? (
                <Box sx={{ width: "98%" }}>
                    <Accordion sx={{ width: "100%" }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <strong>Filtros</strong>
                        </AccordionSummary>
                        <AccordionDetails>
                            {renderAdvancedFilters()}
                        </AccordionDetails>
                    </Accordion>
                </Box>
            ) : (
                renderAdvancedFilters()
            )}

            <Box className={cardStyles.resultsSection}>
                {isLoadingExercises && (
                    <div className={cardStyles.loadingOverlay}>
                        <div className={cardStyles.loadingPanel}>
                            <Typography variant="body1">Actualizando ejercicios...</Typography>
                            <Typography variant="body2">Aplicando filtros y cargando resultados.</Typography>
                        </div>
                    </div>
                )}
                <div className={isLoadingExercises ? cardStyles.resultsDimmed : ""}>
                    {renderExerciseCards()}
                </div>
            </Box>

            <Box className={cardStyles.paginationWrapper}>
                <div className={cardStyles.paginationContent}>
                    <div className={cardStyles.paginationInfo}>
                        <span>
                            Mostrando {exercises.length ? page * rowsPerPage + 1 : 0}-
                            {Math.min((page + 1) * rowsPerPage, totalCount)} de {totalCount}
                        </span>
                        <FormControl size="small" className={cardStyles.rowsSelector}>
                            <InputLabel id="rows-per-page-label">Por página</InputLabel>
                            <Select
                                labelId="rows-per-page-label"
                                value={rowsPerPage}
                                label="Por página"
                                onChange={handleRowsPerPageChange}
                            >
                                {[15, 30, 45, 60].map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>

                    <Pagination
                        count={Math.max(1, Math.ceil(totalCount / rowsPerPage))}
                        page={page + 1}
                        onChange={(event, value) => setPage(value - 1)}
                        color="primary"
                        showFirstButton
                        showLastButton
                        siblingCount={isMobile ? 0 : 1}
                        size={isMobile ? "small" : "medium"}
                    />
                </div>
            </Box>

            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Agregar ejercicio a rutina</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Rutina</InputLabel>
                        <Select
                            value={selectedRoutine}
                            label="Rutina"
                            disabled={routinesLoading}
                            onChange={(e) => setSelectedRoutine(e.target.value)}
                        >
                            {routines.map((routine) => (
                                <MenuItem key={routine.id} value={routine.id}>
                                    {routine.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {routinesLoading && (
                        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                            Cargando rutinas...
                        </Typography>
                    )}
                    <TextField
                        label="Repeticiones (opcional)"
                        type="number"
                        fullWidth
                        value={repetitions}
                        onChange={(e) => setRepetitions(e.target.value)}
                        margin="normal"
                    />
                    <TextField
                        label="Duración (segundos) (opcional)"
                        type="number"
                        fullWidth
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        margin="normal"
                    />
                    <TextField
                        label="Comentario (opcional)"
                        fullWidth
                        multiline
                        minRows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmAdd} color="primary">
                        Agregar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>{detailExercise?.name || "Detalle del ejercicio"}</DialogTitle>
                <DialogContent dividers>
                    {detailExercise && (
                        <div className={cardStyles.detailCard}>
                            <div className={cardStyles.detailMedia}>
                                {detailExercise.image ? (
                                    <img
                                        src={detailExercise.image}
                                        alt={detailExercise.name}
                                        className={cardStyles.detailImage}
                                    />
                                ) : (
                                    <div className={cardStyles.detailFallback}>Sin imagen</div>
                                )}
                                {typeof detailExercise.unilateral === "boolean" && (
                                    <span className={cardStyles.badge}>
                                        {detailExercise.unilateral ? "Unilateral" : "Bilateral"}
                                    </span>
                                )}
                            </div>

                            <div className={cardStyles.detailBody}>
                                <h2 className={cardStyles.detailTitle}>{detailExercise.name}</h2>

                                <div className={cardStyles.detailActions}>
                                    {permissions.includes("core_data.change_exercise") && (
                                        <Tooltip title="Añadir a clase">
                                            <IconButton
                                                className={cardStyles.actionButton}
                                                aria-label="Añadir a clase"
                                                onClick={() => {
                                                    setDetailDialogOpen(false);
                                                    handleOpenAddModal(detailExercise.id);
                                                }}
                                            >
                                                <AddIcon fontSize="medium" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {permissions.includes("core_data.change_exercise") && (
                                        <Tooltip title="Editar ejercicio">
                                            <IconButton
                                                className={cardStyles.actionButton}
                                                aria-label="Editar ejercicio"
                                                onClick={() => router.push(`ejercicios/edit?id=${detailExercise.id}`)}
                                            >
                                                <EditIcon fontSize="medium" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {permissions.includes("core_data.delete_exercise") && (
                                        <Tooltip title="Eliminar ejercicio">
                                            <IconButton
                                                className={`${cardStyles.actionButton} ${cardStyles.deleteAction}`}
                                                aria-label="Eliminar ejercicio"
                                                onClick={() => {
                                                    handleOpenDeleteDialog(detailExercise);
                                                }}
                                            >
                                                <DeleteIcon fontSize="medium" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </div>

                                <div className={cardStyles.detailInfo}>
                                    <div className={cardStyles.metaGrid}>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Creado por</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.created_by || "No especificado"}</span>
                                        </div>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Posición</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.position || "No especificada"}</span>
                                        </div>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Implemento</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.prop || "No especificado"}</span>
                                        </div>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Máquina</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.machine || "No especificada"}</span>
                                        </div>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Grupo</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.group || "No especificado"}</span>
                                        </div>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Caja</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.box || "No"}</span>
                                        </div>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Cabeza</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.head_position || "No especificada"}</span>
                                        </div>
                                        <div className={cardStyles.metaItem}>
                                            <span className={cardStyles.metaLabel}>Slug</span>
                                            <span className={cardStyles.metaValue}>{detailExercise.slug || "No especificado"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={cardStyles.detailGrid}>
                                    <div className={cardStyles.detailBlock}>
                                        <span className={cardStyles.detailLabel}>Springs carro</span>
                                        {renderSpringDots(detailExercise.springs, "car")}
                                    </div>

                                    <div className={cardStyles.detailBlock}>
                                        <span className={cardStyles.detailLabel}>Springs torre</span>
                                        {renderSpringDots(detailExercise.springs, "tower")}
                                    </div>

                                    <div className={cardStyles.detailBlock}>
                                        <span className={cardStyles.detailLabel}>Tags</span>
                                        {detailExercise.tag_images?.some(Boolean) ? (
                                            <div className={cardStyles.detailTags}>
                                                {detailExercise.tag_images.filter(Boolean).map((tagImage, index) => (
                                                    <img
                                                        key={`detail-tag-${detailExercise.id}-${index}`}
                                                        src={tagImage}
                                                        alt={`Tag ${index + 1}`}
                                                        className={cardStyles.detailTagIcon}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <span className={cardStyles.emptyValue}>No especificados</span>
                                        )}
                                    </div>

                                    <div className={cardStyles.detailBlock}>
                                        <span className={cardStyles.detailLabel}>Descripción</span>
                                        <Typography variant="body2" className={cardStyles.detailText}>
                                            {detailExercise.description || "Sin descripción"}
                                        </Typography>
                                    </div>

                                    <div className={cardStyles.detailBlock}>
                                        <span className={cardStyles.detailLabel}>Instrucciones</span>
                                        <Typography variant="body2" className={cardStyles.detailText}>
                                            {detailExercise.instructions || "Sin instrucciones"}
                                        </Typography>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={videoDialogOpen} onClose={() => setVideoDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Vista Previa del Video</DialogTitle>
                <DialogContent dividers>
                    {selectedVideo ? (
                        <video
                            src={selectedVideo}
                            controls
                            style={{ width: "100%", maxHeight: "70vh", display: "block", margin: "0 auto" }}
                        />
                    ) : (
                        <Typography>No hay video disponible.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVideoDialogOpen(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Eliminar ejercicio</DialogTitle>
                <DialogContent>
                    <Typography>
                        ¿Seguro que querés eliminar {exerciseToDelete?.name ? `"${exerciseToDelete.name}"` : "este ejercicio"}?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error">
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </MainPage>
    );
}

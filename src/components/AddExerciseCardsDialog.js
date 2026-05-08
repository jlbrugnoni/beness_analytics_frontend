import { useState } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    DialogContentText,
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
    Accordion,
    AccordionSummary,
    AccordionDetails
} from "@mui/material";
import { Clear as ClearIcon, CheckCircle as CheckCircleIcon, Tune as TuneIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import styles from "@/styles/AddExerciseCardsDialog.module.css";

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
    position__name__in: "Posicion",
    prop__name__in: "Implemento",
    machine__name__in: "Maquina",
    tag__id__in: "Etiqueta",
    group__in: "Grupo",
    box__in: "Caja",
    head_position__in: "Mirada",
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

export default function AddExerciseCardsDialog({
    open,
    onClose,
    onConfirm,
    filters,
    setFilters,
    options,
    exercisesToAdd,
    exerciseResultsCount,
    hasMoreExercises,
    loadingMoreExercises,
    isLoadingExercises,
    onLoadMore,
    selectedExercise,
    setSelectedExercise,
    repetitions,
    setRepetitions,
    duration,
    setDuration,
    comment,
    setComment,
    nameSearch,
    setNameSearch
}) {
    const [configOpen, setConfigOpen] = useState(false);

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
        setNameSearch("");
    };

    const clearNameSearch = () => {
        setNameSearch("");
    };

    const selectedExerciseData = exercisesToAdd.find((exercise) => exercise.id === selectedExercise);

    const handleResultsScroll = (event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 140;

        if (isNearBottom && hasMoreExercises && !loadingMoreExercises) {
            onLoadMore();
        }
    };

    const handleExerciseClick = (exerciseId) => {
        setSelectedExercise(exerciseId);
        setConfigOpen(true);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth={false}
                PaperProps={{
                    sx: { width: "96%", maxWidth: 1440, height: "92vh" }
                }}
            >
                <DialogTitle>Agregar ejercicio a la rutina</DialogTitle>
                <DialogContent dividers className={styles.mainContent}>
                    <Box className={styles.toolbar}>
                        <TextField
                            fullWidth
                            label="Buscar ejercicio por nombre"
                            value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                            variant="outlined"
                            InputProps={{
                                endAdornment: nameSearch && (
                                    <IconButton size="small" onClick={clearNameSearch}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                )
                            }}
                        />

                        <Accordion className={styles.filtersAccordion}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <div className={styles.filtersTrigger}>
                                    <TuneIcon fontSize="small" />
                                    <span>Filtros</span>
                                </div>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={2}>
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
                                                        value={filters[field]}
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
                                                            <MenuItem
                                                                key={`${field}-${item.id ?? item}`}
                                                                value={isTagField ? item.id : item.name || item}
                                                            >
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

                                <Box mt={2} textAlign="right">
                                    <Button variant="text" color="secondary" onClick={clearAllFilters}>
                                        Limpiar todos los filtros
                                    </Button>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    </Box>

                    <Box className={styles.resultsSummary}>
                        <Typography variant="body2">
                            Mostrando {exercisesToAdd.length} de {exerciseResultsCount} ejercicios
                        </Typography>
                        <Typography variant="body2" className={styles.helpText}>
                            Toca una tarjeta para configurar y agregar el ejercicio.
                        </Typography>
                    </Box>

                    <Box className={styles.resultsArea} onScroll={handleResultsScroll}>
                        {isLoadingExercises && (
                            <Box className={styles.loadingOverlay}>
                                <Box className={styles.loadingPanel}>
                                    <Typography variant="body1">Actualizando ejercicios...</Typography>
                                    <Typography variant="body2">Aplicando filtros.</Typography>
                                </Box>
                            </Box>
                        )}

                        <Box
                            className={`${styles.cardsGrid} ${isLoadingExercises ? styles.cardsGridDimmed : ""}`}
                        >
                            {exercisesToAdd.map((exercise) => {
                                const isSelected = selectedExercise === exercise.id;

                                return (
                                    <button
                                        key={exercise.id}
                                        type="button"
                                        className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
                                        onClick={() => handleExerciseClick(exercise.id)}
                                    >
                                        <div className={styles.imageWrapper}>
                                            {exercise.image ? (
                                                <img
                                                    src={exercise.image}
                                                    alt={exercise.name}
                                                    className={styles.image}
                                                />
                                            ) : (
                                                <div className={styles.imageFallback}>Sin imagen</div>
                                            )}
                                            {isSelected && (
                                                <span className={styles.selectedBadge}>
                                                    <CheckCircleIcon fontSize="small" />
                                                    Seleccionado
                                                </span>
                                            )}
                                        </div>

                                        <div className={styles.cardContent}>
                                            <h3 className={styles.cardTitle}>{exercise.name}</h3>
                                            <div className={styles.springsBlock}>
                                                {renderSpringRow(exercise.springs || [], "tower")}
                                                {renderSpringRow(exercise.springs || [], "car")}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {loadingMoreExercises && (
                                <Box className={styles.loadState}>
                                    <Typography>Cargando mas ejercicios...</Typography>
                                </Box>
                            )}

                            {!loadingMoreExercises && !hasMoreExercises && exercisesToAdd.length > 0 && (
                                <Box className={styles.loadState}>
                                    <Typography>Ya no hay mas ejercicios para cargar.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {exercisesToAdd.length === 0 && (
                        <Box className={styles.emptyState}>
                            <Typography>No hay ejercicios para mostrar con esos filtros.</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions className={styles.footer}>
                    <Button onClick={onClose}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={configOpen} onClose={() => setConfigOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Configurar ejercicio</DialogTitle>
                <DialogContent>
                    <DialogContentText className={styles.configIntro}>
                        {selectedExerciseData?.name || "Ejercicio seleccionado"}
                    </DialogContentText>
                    <Box className={styles.configRow}>
                        <TextField
                            label="Repeticiones (opcional)"
                            type="number"
                            fullWidth
                            value={repetitions}
                            onChange={(e) => setRepetitions(e.target.value)}
                        />
                        <TextField
                            label="Duracion (segundos) (opcional)"
                            type="number"
                            fullWidth
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        />
                    </Box>
                    <Box mt={2}>
                        <TextField
                            label="Comentario (opcional)"
                            multiline
                            rows={3}
                            fullWidth
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Anade algun comentario sobre este ejercicio en la clase..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions className={styles.footer}>
                    <Button onClick={() => setConfigOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={async () => {
                            const wasAdded = await onConfirm();
                            if (wasAdded) {
                                setConfigOpen(false);
                            }
                        }}
                        variant="contained"
                        disabled={!selectedExercise}
                    >
                        Agregar ejercicio
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

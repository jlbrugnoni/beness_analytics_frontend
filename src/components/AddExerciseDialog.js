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
    Button
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

export default function AddExerciseDialog({
    open,
    onClose,
    onConfirm,
    filters,
    setFilters,
    options,
    exercisesToAdd,
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

    // ✅ Función para limpiar solo la búsqueda por nombre
    const clearNameSearch = () => {
        setNameSearch("");
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{
                sx: { width: "90%", maxWidth: 800 }
            }}
        >
            <DialogTitle>Agregar ejercicio</DialogTitle>
            <DialogContent>
                <Box mt={2} mb={1} p={2} border="1px solid" borderColor="primary.main" borderRadius={2}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                        Configuración opcional
                    </Typography>

                    <Box
                        display="flex"
                        flexDirection={{ xs: "column", sm: "row" }}
                        gap={2}
                        mt={2}
                    >
                        <TextField
                            label="Repeticiones (opcional)"
                            type="number"
                            fullWidth
                            value={repetitions}
                            onChange={(e) => setRepetitions(e.target.value)}
                        />
                        <TextField
                            label="Duración (segundos) (opcional)"
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
                            placeholder="Añade algún comentario sobre este ejercicio en la clase..."
                        />
                    </Box>
                </Box>

                <Box mt={2} mb={1} p={2} border="1px solid" borderColor="primary.main" borderRadius={2}>
                    <Typography variant="h6" color="primary" fontWeight="bold" mt={0} mb={0}>
                        Seleccione ejercicio
                    </Typography>

                    {/* ✅ Campo de búsqueda por nombre */}
                    <Box mt={2} mb={2}>
                        <TextField
                            fullWidth
                            label="Buscar ejercicio por nombre"
                            value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                            variant="outlined"
                            InputProps={{
                                endAdornment: nameSearch && (
                                    <IconButton 
                                        size="small" 
                                        onClick={clearNameSearch}
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                )
                            }}
                        />
                    </Box>

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
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => clearFilter(field)}
                                                    >
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

                    <Box mt={3}>
                        <FormControl fullWidth>
                            <InputLabel>Seleccionar ejercicio</InputLabel>
                            <Select
                                value={selectedExercise || ""}
                                onChange={(e) => setSelectedExercise(e.target.value)}
                            >
                                {exercisesToAdd.map((exercise) => (
                                    <MenuItem key={exercise.id} value={exercise.id}>
                                        {exercise.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Box mt={2} textAlign="right">
                        <Button variant="text" color="secondary" onClick={clearAllFilters}>
                            Limpiar todos los filtros
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={onConfirm} color="primary" disabled={!selectedExercise}>
                    Agregar
                </Button>
            </DialogActions>
        </Dialog>
    );
}

import { useState } from "react";
import styles from "@/styles/tablePage.module.css";
import responsiveStyles from "@/styles/responsive.module.css";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";
import { useRouter } from "next/router";
import Button from "@mui/material/Button";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import ImageIcon from "@mui/icons-material/Image";
import InstructionsIcon from "@mui/icons-material/MenuBook";
import VideoIcon from "@mui/icons-material/SmartDisplay";
import AddIcon from "@mui/icons-material/Add";
import EjerciciosIcon from "@mui/icons-material/SportsGymnastics";

import axios from "axios";
import useFetchToken from "@/components/useFetchUserId"; // ✅ Ensure you get the token correctly


import FormComponent from "@/components/FormComponent";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

// import axios from "axios";
// import useFetchToken from "@/components/useFetchUserId"; // ✅ Ensure you get the token correctly

const TableComponent = ({ data, columns, entityName, onInfo, onEdit, onEditSession, onSummary, onDelete, onAdding = false, onEditRoutine, totalCount, page, rowsPerPage, onPageChange, onRowsPerPageChange, onFeedback, canEditRow, canDeleteRow }) => {


    const router = useRouter();
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    // const [page, setPage] = useState(0);
    // const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [videoDialogOpen, setVideoDialogOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);


    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [selectedRoutine, setSelectedRoutine] = useState("");
    const [routines, setRoutines] = useState([]);
    const [repetitions, setRepetitions] = useState("");
    const [duration, setDuration] = useState("");

    // ✅ State for Description and Instructions Dialogs
    const [infoDialogOpen, setInfoDialogOpen] = useState(false);
    const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
    const [dialogContent, setDialogContent] = useState("");

    const confirmDelete = (id) => {
        setItemToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDelete = () => {
        onDelete(itemToDelete);
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    };

    const handleImagePreview = (imageUrl) => {
        setSelectedImage(imageUrl);
        setImageDialogOpen(true);
    };

    const handleVideoPreview = (videoUrl) => {
        setSelectedVideo(videoUrl);
        setVideoDialogOpen(true);
    };

    const formatBoolean = (value) => {
        if (value === true) return "Sí";
        if (value === false) return "No";
        return "N/A";
    };

    // ✅ Handle Info and Instructions Click
    const handleDialogOpen = (content, type) => {
        setDialogContent(content || "No hay información disponible.");
        if (type === "info") setInfoDialogOpen(true);
        if (type === "instructions") setInstructionsDialogOpen(true);
    };

    const handleOpenAddModal = async (exerciseId) => {

        setSelectedExercise(exerciseId);
        setRepetitions("");
        setDuration("");

        try {
            const response = await axios.get(`${backendUrl}/api/data/routines/`, {
                headers: { Authorization: `Token ${token}` },
                params: { on_edit: true } // ✅ Fetch only open routines
            });
            setRoutines(response.data.results || []);
            setAddDialogOpen(true);  // ✅ Ensure modal state is updated
        } catch (error) {
            console.error("❌ Error fetching routines:", error);
        }
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
                },
                { headers: { Authorization: `Token ${token}` } }
            );

            alert("Ejercicio agregado correctamente.");
            setAddDialogOpen(false);
        } catch (error) {
            console.error("❌ Error adding exercise to routine:", error);

            let errorMsg = "Hubo un error al agregar el ejercicio.";
            if (error.response) {
                errorMsg = error.response.data.error || errorMsg;
            }

            alert(errorMsg);
        }
    };



    return (
        <>
            <TableContainer component={Paper} className={styles.tableContainer}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell key={col.field} className={col.className || ""}>
                                    {col.label}
                                </TableCell>
                            ))}
                            <TableCell className={"AcctionsCell"}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((item) => (
                                <TableRow key={item.id}>
                                    {columns.map((col) => (
                                        <TableCell key={col.field} className={col.className || ""}>
                                            {col.render
                                                ? col.render(item)
                                                : typeof item[col.field] === "boolean"
                                                    ? item[col.field] ? "Sí" : "No"
                                                    : item[col.field] || "N/A"}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <div className={styles.actionsCell}>
                                        {onInfo && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <InfoIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => onInfo(item.id)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => onInfo(item.id)}
                                                >
                                                    Info
                                                </Button>
                                            </div>
                                        )}

                                        {onEdit && (canEditRow ? canEditRow(item) : true) && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <EditIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => onEdit(item.id)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => onEdit(item.id)}
                                                >
                                                    Editar
                                                </Button>
                                            </div>
                                        )}

                                        {onEditSession && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <EditIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => onEditSession(item)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => onEditSession(item)}
                                                >
                                                    Editar
                                                </Button>
                                            </div>
                                        )}

                                        {onSummary && item.routine_id && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <EjerciciosIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => onSummary(item)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => onSummary(item)}
                                                >
                                                    Ejercicios
                                                </Button>
                                            </div>
                                        )}

                                        {item.description && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <InfoIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => handleDialogOpen(item.description, "info")}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => handleDialogOpen(item.description, "info")}
                                                >
                                                    Info
                                                </Button>
                                            </div>
                                        )}

                                        {item.instructions && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <InstructionsIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => handleDialogOpen(item.instructions, "instructions")}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => handleDialogOpen(item.instructions, "instructions")}
                                                >
                                                    Instrucciones
                                                </Button>
                                            </div>
                                        )}

                                        {onDelete && (canDeleteRow ? canDeleteRow(item) : true) && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <DeleteIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => confirmDelete(item.id)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => confirmDelete(item.id)}
                                                    color="error"
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        )}

                                        {item.image && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <ImageIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => handleImagePreview(item.image)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => handleImagePreview(item.image)}
                                                >
                                                    Imagen
                                                </Button>
                                            </div>
                                        )}

                                        {item.video && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <VideoIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => handleVideoPreview(item.video)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => handleVideoPreview(item.video)}
                                                >
                                                    Vídeo
                                                </Button>
                                            </div>
                                        )}

                                        {onAdding && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <AddIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => handleOpenAddModal(item.id)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => handleOpenAddModal(item.id)}
                                                >
                                                    Añadir
                                                </Button>
                                            </div>
                                        )}

                                        {onEditRoutine && (
                                            <div className={responsiveStyles.actionsCell}>
                                                <EjerciciosIcon
                                                    className={`${styles.buttonIcon} ${responsiveStyles.hideOnMobile}`}
                                                    onClick={() => onEditRoutine(item.id)}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    className={responsiveStyles.showOnlyOnMobile}
                                                    onClick={() => onEditRoutine(item.id)}
                                                >
                                                    Rutina
                                                </Button>
                                            </div>
                                        )}

                                        {onFeedback && item.state_name === 'Completada' && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                onClick={() => onFeedback(item)}
                                                sx={{ ml: 1 }}
                                            >
                                                💬 Feedback
                                            </Button>
                                        )}
                                        </div>

                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} style={{ textAlign: "center", padding: "20px" }}>
                                    No hay registros disponibles.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={onPageChange}
                    // onRowsPerPageChange={onRowsPerPageChange}
                    // rowsPerPageOptions={[10, 15, 20, 50]}
                    sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select": { display: "none" } }}
                />
            </TableContainer>

            {/* ✅ Description Dialog */}
            <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)}>
                <DialogTitle>Descripción</DialogTitle>
                <DialogContent>
                    <DialogContentText>{dialogContent}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInfoDialogOpen(false)} color="primary">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✅ Instructions Dialog */}
            <Dialog open={instructionsDialogOpen} onClose={() => setInstructionsDialogOpen(false)}>
                <DialogTitle>Instrucciones</DialogTitle>
                <DialogContent>
                    <DialogContentText>{dialogContent}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInstructionsDialogOpen(false)} color="primary">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 🔥 Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>¿Eliminar {entityName}?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que quieres eliminar este {entityName.toLowerCase()}? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleDelete} color="error">
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 🔥 Image Preview Dialog */}
            <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)}>
                <DialogTitle>Vista Previa de la Imagen</DialogTitle>
                <DialogContent>
                    {selectedImage && <img src={selectedImage} alt="Preview" className={styles.previewImage} />}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setImageDialogOpen(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            {/* 🔥 Video Preview Dialog */}
            <Dialog open={videoDialogOpen} onClose={() => setVideoDialogOpen(false)}>
                <DialogTitle>Vista Previa del Video</DialogTitle>
                <DialogContent>
                    {selectedVideo && (
                        <video src={selectedVideo} controls className={styles.previewVideo} />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVideoDialogOpen(false)} color="primary">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 🔥 Add Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
                <DialogTitle>Agregar ejercicio a rutina</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth>
                        <InputLabel>Rutina</InputLabel>
                        <Select
                            value={selectedRoutine}
                            onChange={(e) => setSelectedRoutine(e.target.value)}
                        >
                            {routines.map((routine) => (
                                <MenuItem key={routine.id} value={routine.id}>
                                    {routine.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmAdd} color="primary">
                        Agregar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default TableComponent;

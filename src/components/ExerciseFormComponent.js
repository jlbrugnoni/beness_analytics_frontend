import { useState, useEffect, use } from "react";
import { Button, TextField, CircularProgress, Alert, IconButton, MenuItem, FormControlLabel, Checkbox, Grid } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";

import { parseRecordingBasename } from "@/utils/parseBasename";


import DeleteIcon from "@mui/icons-material/Delete";
import styles from "@/styles/formPage.module.css";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";
import { deleteFromCloudinary } from "@/utils/deleteFromCloudinary";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import Autocomplete from "@mui/material/Autocomplete";
const HEAD_POSITIONS = ["Torre", "Barra", "Lateral"];
const GROUPS = ["Piernas", "Tronco", "Brazos"];
const BOX = ["No", "Larga", "Corta"];

const videoUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET;
const imageUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_UPLOAD_PRESET;

const SPRING_COLORS = {
    red: "#ff0000",
    blue: "#0000ff",
    yellow: "#ffff00",
    green: "#008000",
    red1: "#ff0000",
    red2: "#ff0000",
};

const ExerciseFormComponent = ({
    actionName,
    entityName,
    initialData,
    onSubmit,
    secondarySubmitLabel,
    onSecondarySubmit,
    onCancel,
    positions,
    props,
    machines,
    tags
}) => {
    const [formData, setFormData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [springs, setSprings] = useState([]);
    const [selectedSprings, setSelectedSprings] = useState([]);
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    /////

    const [gifFile, setGifFile] = useState(null);
    const [gifPreview, setGifPreview] = useState("");
    const [removeExistingGif, setRemoveExistingGif] = useState(false);

    ////

    // ✅ Temporary file storage
    const [tempFile, setTempFile] = useState(null);
    const [tempPreview, setTempPreview] = useState(""); // Local preview URL
    const [removeExistingMedia, setRemoveExistingMedia] = useState(false); // ✅ Track if existing video should be deleted

    useEffect(() => {
        fetchSprings();
    }, []);

    useEffect(() => {
        if (initialData && initialData.springs && springs.length > 0) {
            const assignedSpringIds = initialData.springs.map(s => s.spring.id); // Extract spring IDs
            setSelectedSprings(assignedSpringIds);
        }
    }, [initialData, springs]); // Runs when either `initialData` or `springs` change

    useEffect(() => {
        if (initialData.video) {
            setTempPreview(initialData.video); // ✅ Show existing video if available
        }
    }, [initialData]);

    useEffect(() => {
        if (initialData.image) {
            setGifPreview(initialData.image); // ✅ Show existing gif if available
        }
    }, [initialData]);

    const fetchSprings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/all_springs/`, {
                headers: { Authorization: `Token ${token}` }
            });
            setSprings(response.data);
        } catch (error) {
            console.error("Error fetching springs:", error);
        }
    };

    const handleSpringChange = (springId) => {
        setSelectedSprings((prev) =>
            prev.includes(springId)
                ? prev.filter((id) => id !== springId)
                : [...prev, springId]
        );
    };

    // ✅ Handle file selection (stores file temporarily)
    const handleFileSelection = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setTempFile(file);
        setRemoveExistingMedia(false); // ✅ Reset delete flag if a new file is chosen

        // ✅ Generate local preview URL for video
        const previewUrl = URL.createObjectURL(file);
        setTempPreview(previewUrl);
    };

    // ✅ Remove selected temporary video (cancel upload)
    const handleRemoveTempVideo = () => {
        setTempFile(null);
        setTempPreview("");
    };

    // ✅ Remove existing video (mark for deletion)
    const handleRemoveExistingVideo = () => {
        setRemoveExistingMedia(true);
        setTempPreview(""); // ✅ Remove preview
    };

    /// nuevo handler gif

    const handleGifSelection = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!/\.gif$/i.test(file.name)) {
            setError("El archivo de imagen debe ser un .gif");
            return;
        }
        setGifFile(file);
        setRemoveExistingGif(false); // seleccionaste uno nuevo → no borres el viejo
        const url = URL.createObjectURL(file);
        setGifPreview(url);
    };

    const handleRemoveExistingGif = () => {
        setRemoveExistingGif(true);
        setGifPreview("");
    };

    // ✅ Comprehensive validation function
    const validateForm = () => {
        // 1. Name validation (required, max 150 characters)
        if (!formData.name || !formData.name.trim()) {
            setError("⚠️ El nombre del ejercicio es obligatorio.");
            return false;
        }
        if (formData.name.length > 150) {
            setError(`⚠️ El nombre excede el límite máximo de 150 caracteres. Actualmente: ${formData.name.length} caracteres.`);
            return false;
        }

        // 2. Head position validation (max 50 characters)
        if (formData.head_position && formData.head_position.length > 50) {
            setError(`⚠️ La posición de la mirada excede el límite de 50 caracteres. Actualmente: ${formData.head_position.length} caracteres.`);
            return false;
        }

        // 3. Box validation (max 50 characters)
        if (formData.box && formData.box.length > 50) {
            setError(`⚠️ El valor de la caja excede el límite de 50 caracteres. Actualmente: ${formData.box.length} caracteres.`);
            return false;
        }

        // 4. Group validation (max 50 characters)
        if (formData.group && formData.group.length > 50) {
            setError(`⚠️ El grupo excede el límite de 50 caracteres. Actualmente: ${formData.group.length} caracteres.`);
            return false;
        }

        // 5. Position validation (max 150 characters for name)
        if (formData.position && formData.position.length > 150) {
            setError(`⚠️ La posición excede el límite de 150 caracteres. Actualmente: ${formData.position.length} caracteres.`);
            return false;
        }

        // 6. Prop validation (max 150 characters for name)
        if (formData.prop && formData.prop.length > 150) {
            setError(`⚠️ El implemento excede el límite de 150 caracteres. Actualmente: ${formData.prop.length} caracteres.`);
            return false;
        }

        // 7. Machine validation (max 150 characters for name)
        if (formData.machine && formData.machine.length > 150) {
            setError(`⚠️ La máquina excede el límite de 150 caracteres. Actualmente: ${formData.machine.length} caracteres.`);
            return false;
        }

        // // 8. File validation (optional but recommended)
        // if (tempFile && tempFile.size > 100 * 1024 * 1024) { // 100MB limit for videos
        //     setError("⚠️ El archivo de video es demasiado grande. El límite es 100MB.");
        //     return false;
        // }

        // if (gifFile && gifFile.size > 10 * 1024 * 1024) { // 10MB limit for GIFs
        //     setError("⚠️ El archivo GIF es demasiado grande. El límite es 10MB.");
        //     return false;
        // }

        return true;
    };

    const submitForm = async (submitHandler) => {
        // Clear previous errors
        setError(null);

        // Validate form before submission
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            let videoUrl = formData.video;
            let videoPublicId = formData.video_public_id || "";
            let gifUrl = formData.image || "";
            let gifPublicId = formData.gif_public_id || "";

            // 1) Determinar basename a partir del archivo de video (si hay)
            //    Si no hay video nuevo, pero hay gif nuevo, intentamos parsear desde el gif.
            //    Como fallback usamos el nombre del ejercicio.
            let baseName = "ejercicio";
            if (tempFile) {
                baseName = parseRecordingBasename(tempFile.name, formData.name || entityName || "ejercicio");
            } else if (gifFile) {
                baseName = parseRecordingBasename(gifFile.name, formData.name || entityName || "ejercicio");
            } else {
                baseName = parseRecordingBasename("", formData.name || entityName || "ejercicio");
            }

            // 2) Subir VIDEO si se seleccionó
            if (tempFile) {
                const upVideo = await uploadToCloudinary(tempFile, "video", {
                    baseName,
                    // folder: "uploads/videos", // <-- carpeta videos
                    uploadPreset: videoUploadPreset, // opcional si separas presets
                });
                if (!upVideo) {
                    setError("Error subiendo el video.");
                    setLoading(false);
                    return;
                }
                videoUrl = upVideo.url;
                videoPublicId = upVideo.publicId;
            }

            // 3) Subir GIF si se seleccionó
            if (gifFile) {
                const upGif = await uploadToCloudinary(gifFile, "image", {
                    baseName,
                    // folder: "uploads/gifs", // <-- carpeta gifs
                    uploadPreset: imageUploadPreset, // opcional si separas presets
                });
                if (!upGif) {
                    setError("Error subiendo el GIF.");
                    setLoading(false);
                    return;
                }
                gifUrl = upGif.url;
                gifPublicId = upGif.publicId;
            }

            // 5) Enviar payload al backend
            const updatedFormData = {
                ...formData,
                video: videoUrl,                 // mantiene compatibilidad
                // video_public_id: videoPublicId,  // NUEVO
                image: gifUrl,                 // NUEVO (usaremos esto en la UI en vez de image)
                // gif_public_id: gifPublicId,      // NUEVO
                springs: selectedSprings
            };

            await submitHandler(updatedFormData, setError, setSuccess);

            setTimeout(() => {
                setSuccess(false);
                onCancel();
            }, 3000);
        } catch (err) {
            console.error(err);
            setError("Error guardando el ejercicio.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => submitForm(onSubmit);

    const handleSecondarySubmit = () => {
        if (onSecondarySubmit) {
            submitForm(onSecondarySubmit);
        }
    };

    const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";
    const canEnableExercise =
        hasValue(formData.position) &&
        hasValue(formData.prop) &&
        hasValue(formData.machine) &&
        hasValue(formData.head_position) &&
        hasValue(formData.group) &&
        hasValue(formData.box);

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{actionName} {entityName}</h1>
            {loading ? (
                <CircularProgress />
            ) : (
                <>
                    {error && <Alert severity="error" className={styles.error}>{error}</Alert>}
                    {success && <Alert severity="success" className={styles.success}>Ejercicio guardado exitosamente!</Alert>}
                    <div className={styles.boxContainer}>
                        <div className={styles.formContainer}>
                            <TextField 
                                label="Nombre" 
                                name="name" 
                                value={formData.name} 
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                fullWidth 
                                required
                                error={formData.name && formData.name.length > 150}
                                helperText={`${formData.name?.length || 0}/150 caracteres${formData.name && formData.name.length > 150 ? ' - ¡Excede el límite!' : ''}`}
                            />
                            <TextField label="Descripción" name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} fullWidth multiline rows={3} />
                            <Autocomplete
                                multiple
                                options={tags}  // 🔹 con [{ id, name }]
                                getOptionLabel={(option) => option.name}
                                value={
                                    tags.filter(tag => formData.tags?.includes(tag.id))
                                }
                                onChange={(_, newValue) => {
                                    setFormData({
                                        ...formData,
                                        tags: newValue.map(tag => tag.id)
                                    });
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Etiquetas"
                                        variant="outlined"
                                        className={styles.formField}
                                    />
                                )}
                            />
                            <TextField label="Instrucciones" name="instructions" value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} fullWidth multiline rows={3} />
                            <TextField select label="Posición" name="position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} fullWidth>
                                {positions.map((pos) => <MenuItem key={pos.id} value={pos.name}>{pos.name}</MenuItem>)}
                            </TextField>
                            <TextField select label="Implemento" name="prop" value={formData.prop || ""} onChange={(e) => setFormData({ ...formData, prop: e.target.value || null })} fullWidth>
                                <MenuItem value="">Ninguno</MenuItem> {/* ✅ Opción vacía visible */}
                                {props.map((prop) => (
                                    <MenuItem key={prop.id} value={prop.name}>{prop.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField select label="Máquina" name="machine" value={formData.machine} onChange={(e) => setFormData({ ...formData, machine: e.target.value })} fullWidth>
                                {machines.map((mach) => <MenuItem key={mach.id} value={mach.name}>{mach.name}</MenuItem>)}
                            </TextField>
                            <TextField 
                                select 
                                label="Mirada" 
                                name="head_position" 
                                value={formData.head_position} 
                                onChange={(e) => setFormData({ ...formData, head_position: e.target.value })} 
                                fullWidth
                                error={formData.head_position && formData.head_position.length > 50}
                                helperText={formData.head_position ? `${formData.head_position.length}/50 caracteres` : ''}
                            >
                                {HEAD_POSITIONS.map((pos) => <MenuItem key={pos} value={pos}>{pos}</MenuItem>)}
                            </TextField>
                            <TextField 
                                select 
                                label="Grupo" 
                                name="group" 
                                value={formData.group} 
                                onChange={(e) => setFormData({ ...formData, group: e.target.value })} 
                                fullWidth
                                error={formData.group && formData.group.length > 50}
                                helperText={formData.group ? `${formData.group.length}/50 caracteres` : ''}
                            >
                                {GROUPS.map((group) => <MenuItem key={group} value={group}>{group}</MenuItem>)}
                            </TextField>
                            <TextField 
                                select 
                                label="Caja" 
                                name="box" 
                                value={formData.box} 
                                onChange={(e) => setFormData({ ...formData, box: e.target.value })} 
                                fullWidth
                                error={formData.box && formData.box.length > 50}
                                helperText={formData.box ? `${formData.box.length}/50 caracteres` : ''}
                            >
                                {BOX.map((box) => <MenuItem key={box} value={box}>{box}</MenuItem>)}
                            </TextField>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked={formData.unilateral} onChange={() => setFormData({ ...formData, unilateral: !formData.unilateral })} /> Unilateral
                            </label>

                            {/* ✅ Spring Selection */}
                            <h3>Resortes de Carro</h3>
                            <Grid container spacing={2}>
                                {springs.filter(s => s.spring_type === "car").map((spring) => (
                                    <Grid item key={spring.id}>
                                        <FormControlLabel
                                            control={<Checkbox checked={selectedSprings.includes(spring.id)} onChange={() => handleSpringChange(spring.id)} />}
                                            label={
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        width: "20px",
                                                        height: "20px",
                                                        borderRadius: "50%",
                                                        backgroundColor: SPRING_COLORS[spring.name.toLowerCase()] || "black",
                                                        border: "1px solid #000", // Optional border for contrast
                                                    }}
                                                ></span>
                                            }
                                        />
                                    </Grid>
                                ))}
                            </Grid>

                            <h3>Resortes de Torre</h3>
                            <Grid container spacing={2}>
                                {springs.filter(s => s.spring_type === "tower").map((spring) => (
                                    <Grid item key={spring.id}>
                                        <FormControlLabel
                                            control={<Checkbox checked={selectedSprings.includes(spring.id)} onChange={() => handleSpringChange(spring.id)} />}
                                            label={
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        width: "20px",
                                                        height: "20px",
                                                        borderRadius: "50%",
                                                        backgroundColor: SPRING_COLORS[spring.name.toLowerCase()] || "black",
                                                        border: "1px solid #000",
                                                    }}
                                                ></span>
                                            }
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                            {/* ✅ Video Upload */}
                            <input type="file" accept="video/*" style={{ display: "none" }} id="videoUpload" onChange={handleFileSelection} disabled />
                            <label className={styles.buttonsContainer} htmlFor="videoUpload">
                                <Button variant="contained" component="span" startIcon={<UploadIcon />} disabled>Subir Video</Button>
                            </label>

                            {/* ✅ Show preview & delete icon */}
                            {tempPreview && (
                                <div className={styles.videoPreviewContainer}>
                                    <video src={tempPreview} controls width="300" />
                                    <IconButton color="error" onClick={tempFile ? handleRemoveTempVideo : handleRemoveExistingVideo} disabled>
                                        <DeleteIcon />
                                    </IconButton>
                                </div>
                            )}


                            {/* ✅ GIF Upload */}
                            <input type="file" accept="image/gif" style={{ display: "none" }} id="gifUpload" onChange={handleGifSelection} disabled />
                            <label className={styles.buttonsContainer} htmlFor="gifUpload">
                                <Button variant="outlined" component="span" startIcon={<UploadIcon />} disabled>Subir GIF (opcional)</Button>
                            </label>

                            {gifPreview && (
                                <div className={styles.videoPreviewContainer}>
                                    <img src={gifPreview} alt="GIF preview" width="300" />
                                    {/* <IconButton color="error" onClick={() => { setGifFile(null); setGifPreview(""); }}> */}
                                    <IconButton
                                        color="error"
                                        disabled
                                        onClick={() => {
                                            if (gifFile) {
                                                // quitar GIF temporal (cancelar subida)
                                                setGifFile(null);
                                                setGifPreview("");
                                            } else {
                                                // marcar para borrar el GIF existente del backend
                                                handleRemoveExistingGif();
                                            }
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </div>
                            )}
                        </div>
                        <div className={styles.buttonsContainer}>
                            <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
                            {onSecondarySubmit && secondarySubmitLabel && (
                                <Button variant="contained" color="success" onClick={handleSecondarySubmit} disabled={!canEnableExercise}>
                                    {secondarySubmitLabel}
                                </Button>
                            )}
                            <Button variant="outlined" onClick={onCancel}>Cancelar</Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExerciseFormComponent;

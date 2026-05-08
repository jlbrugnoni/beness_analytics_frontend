import { useState, useEffect } from "react";
import { Button, TextField, CircularProgress, Alert, IconButton, FormControlLabel, Switch } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";
import styles from "@/styles/formPage.module.css";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";
import { deleteFromCloudinary } from "@/utils/deleteFromCloudinary";
import Autocomplete from "@mui/material/Autocomplete";
import useFetchToken from "@/components/useFetchUserId";

const FormComponent = ({
    actionName,
    entityName,
    fields,
    initialData,
    fetchData,
    onSubmit,
    onCancel,
    showMediaUpload = true // ✅ By default, media upload is enabled
}) => {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    const [formData, setFormData] = useState(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [tempFile, setTempFile] = useState(null); // ✅ Temporary file
    const [tempPreview, setTempPreview] = useState(""); // ✅ Local preview URL
    const [fileType, setFileType] = useState(""); // ✅ Type (image/video)
    const [removeExistingMedia, setRemoveExistingMedia] = useState(false); // ✅ Track if existing media should be deleted


    useEffect(() => {
        if (fetchData) {
            fetchData().then((data) => {
                setFormData((prevData) => ({
                    ...prevData,
                    ...data, // Merge only if fields haven't been changed
                }));
                setLoading(false);
            }).catch(() => {
                setError(`Error cargando ${entityName}`);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    // ✅ Handle file selection (temporary storage)
    const handleFileSelection = (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        setTempFile(file);
        setFileType(type);

        // ✅ Generate local preview URL
        const previewUrl = URL.createObjectURL(file);
        setTempPreview(previewUrl);

        setRemoveExistingMedia(false);
    };

    // ✅ Remove selected temporary file (cancel change)
    const handleRemoveFile = () => {
        setTempFile(null);
        setTempPreview("");
    };

    // ✅ Remove existing file (only deletes from Cloudinary if saved)
    const handleRemoveExistingMedia = () => {
        setRemoveExistingMedia(true);
        setTempPreview("");
        setFormData({ ...formData, image: "" }); // ✅ Update formData immediately
    };

    // ✅ Handle save (upload media only on submission)
    const handleSubmit = async () => {
        try {
            let uploadedUrl = formData.image;

            let name = `${entityName}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            if (tempFile) {
                uploadedUrl = await uploadToCloudinary(tempFile, fileType, name);
                if (!uploadedUrl) {
                    setError("Error subiendo el archivo.");
                    return;
                }
            }

            if (removeExistingMedia) {
                if (formData.image) await deleteFromCloudinary(formData.image, backendUrl, token);
                uploadedUrl = "";
            }

            const updatedFormData = { ...formData, [fileType]: uploadedUrl };
            setFormData(updatedFormData);

            await onSubmit(updatedFormData, setError, setSuccess);

            setTimeout(() => {
                setSuccess(false);
                onCancel();
            }, 3000);
        } catch (error) {
            setError("Error al actualizar la información.");
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{actionName} {entityName}</h1>

            {loading ? (
                <CircularProgress />
            ) : (
                <>
                    {error && <Alert severity="error" className={styles.error}>{error}</Alert>}
                    {success && <Alert severity="success" className={styles.success}>{entityName} actualizado exitosamente!</Alert>}

                    <div className={styles.boxContainer}>
                        <div className={styles.formContainer}>
                            {fields.map((field) => (
                                field.type === "multiselect" ? (
                                    <Autocomplete
                                        key={field.name}
                                        multiple
                                        options={field.options}
                                        getOptionLabel={(option) => option.label}
                                        value={field.options.filter((opt) => formData[field.name]?.includes(opt.value))}
                                        onChange={(_, newValue) => {
                                            setFormData({ ...formData, [field.name]: newValue.map((opt) => opt.value) });
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label={field.label}
                                                variant="outlined"
                                                className={styles.formField}
                                            />
                                        )}
                                    />
                                ) : field.type === "select" ? (
                                    <TextField
                                        key={field.name}
                                        select
                                        label={field.label}
                                        name={field.name}
                                        variant="outlined"
                                        // value={formData[field.name] || ""} 
                                        value={
                                            field.options.some((option) => option.value === formData[field.name])
                                                ? formData[field.name]
                                                : ""  // ✅ Ensures value is from the options list
                                        }
                                        onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                                        className={styles.formField}
                                        SelectProps={{ native: true }}
                                    >
                                        {field.options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </TextField>
                                ) : field.type === "boolean" ? ( // ✅ Render as Switch for boolean fields
                                    <FormControlLabel
                                        key={field.name}
                                        control={
                                            <Switch
                                                checked={formData[field.name] || false}
                                                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                                            />
                                        }
                                        label={field.label}
                                        className={styles.formField}
                                    />
                                ) : (
                                    <TextField
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        variant="outlined"
                                        value={formData[field.name]}
                                        onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                                        className={styles.formField}
                                        type={field.type || "text"}
                                        multiline={field.multiline || false}
                                        rows={field.multiline ? 3 : 1}
                                        disabled={field.disabled || false}
                                    />
                                )
                            ))}

                            {/* ✅ Conditional File Upload Section */}
                            {showMediaUpload && (
                                <div className={styles.uploadContainer}>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        style={{ display: "none" }}
                                        id="fileUpload"
                                        onChange={(e) => handleFileSelection(e, "image")}
                                    />
                                    <label htmlFor="fileUpload">
                                        <Button variant="contained" component="span" className={styles.uploadButton} startIcon={<UploadIcon />}>
                                            Seleccionar Archivo
                                        </Button>
                                    </label>

                                    {tempPreview ? (
                                        <div className={styles.imagePreviewContainer}>
                                            {fileType === "image" ? (
                                                <img src={tempPreview} alt="Preview" className={styles.previewImage} />
                                            ) : (
                                                <video src={tempPreview} controls className={styles.previewVideo} />
                                            )}
                                            <IconButton color="error" onClick={handleRemoveFile}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </div>
                                    ) : (
                                        formData.image && !removeExistingMedia ? (
                                            <div className={styles.imagePreviewContainer}>
                                                <img src={formData.image} alt="Current" className={styles.previewImage} />
                                                <IconButton color="error" onClick={handleRemoveExistingMedia}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </div>
                                        ) : (
                                            <Alert severity="info">No hay imagen cargada.</Alert>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.buttonsContainer}>
                            <Button variant="contained" onClick={handleSubmit} className={styles.createButton}>
                                Guardar
                            </Button>
                            <Button variant="outlined" onClick={onCancel} className={styles.cancelButton}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FormComponent;
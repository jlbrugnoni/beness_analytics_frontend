import MainPage from "@/pages/mainPage";
import Head from "next/head";
import axios from "axios";
import { useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    LinearProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import useFetchToken from "@/components/useFetchUserId";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const videoUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET;
const imageUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_UPLOAD_PRESET;

const SUPPORTED_IMAGE_TYPES = ["jpg", "jpeg", "png", "webp", "gif"];
const SUPPORTED_VIDEO_TYPES = ["mp4", "mov", "m4v", "webm"];

const stripExtension = (fileName = "") => fileName.replace(/\.[^/.]+$/, "");

const getExtension = (fileName = "") => {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

const normalizePairingKey = (fileName = "") =>
    stripExtension(fileName)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const buildExerciseCode = (baseName = "") => {
    const cleaned = baseName.trim();
    const withoutPrefix = cleaned.replace(/^va[\s._-]*/i, "").trim();
    const match = withoutPrefix.match(/(\d+)[\s._-]*(\d+)/);

    if (match) {
        return `${match[1]}.${match[2]}`;
    }

    return withoutPrefix || cleaned;
};

const buildCloudinaryBaseName = (baseName = "", timestamp) => {
    const code = buildExerciseCode(baseName);
    const normalizedCode = code
        .toLowerCase()
        .replace(/\./g, "_")
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_|_$/g, "");

    return `va_${normalizedCode}_${timestamp}`;
};

const BULK_UPLOAD_DEBUG_PREFIX = "[BulkUploadExercises]";

const logBulkUploadDebug = (label, details = {}) => {
    // Grouped logs make it easier to see which external boundary failed.
    console.groupCollapsed(`${BULK_UPLOAD_DEBUG_PREFIX} ${label}`);
    Object.entries(details).forEach(([key, value]) => {
        console.log(key, value);
    });
    console.groupEnd();
};

const buildAxiosDebugDetails = (error) => ({
    message: error?.message,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    data: error?.response?.data,
    requestUrl: error?.config?.url,
    method: error?.config?.method,
});

const isNetworkLoadError = (error) =>
    error?.name === "TypeError" &&
    ["Load failed", "Failed to fetch", "NetworkError when attempting to fetch resource."].includes(error?.message);

const getReadableErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (isNetworkLoadError(error) && error?.source?.startsWith("cloudinary:")) {
        return "El navegador no recibio respuesta de Cloudinary. Revisa la pestana Network: suele ser conexion, CORS/bloqueo del navegador, endpoint/cloud name incorrecto, o video demasiado grande para una subida directa.";
    }

    if (typeof responseData === "string") {
        return responseData;
    }

    if (responseData?.detail) {
        return responseData.detail;
    }

    if (responseData && typeof responseData === "object") {
        const firstFieldError = Object.entries(responseData).find(([, value]) => value);
        if (firstFieldError) {
            const [field, value] = firstFieldError;
            return `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`;
        }
    }

    return error?.message || "Error desconocido";
};

const uploadToCloudinaryWithBaseName = async (file, resourceType, baseName) => {
    const formData = new FormData();
    const uploadPreset = resourceType === "video" ? videoUploadPreset : imageUploadPreset;

    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("public_id", baseName);

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    logBulkUploadDebug("Cloudinary upload started", {
        resourceType,
        endpoint,
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size,
        publicId: baseName,
        cloudName,
        uploadPreset,
    });

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
        });
        const responseText = await response.text();
        let data = null;

        try {
            data = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
            logBulkUploadDebug("Cloudinary response was not JSON", {
                resourceType,
                status: response.status,
                statusText: response.statusText,
                responseText,
                parseError,
            });
        }

        logBulkUploadDebug("Cloudinary upload response", {
            resourceType,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data,
        });

        if (!response.ok) {
            const error = new Error(data?.error?.message || responseText || `Cloudinary ${resourceType} upload failed`);
            error.source = `cloudinary:${resourceType}`;
            error.debugDetails = {
                status: response.status,
                statusText: response.statusText,
                data,
                responseText,
            };
            throw error;
        }

        return data.secure_url;
    } catch (error) {
        error.source = error.source || `cloudinary:${resourceType}`;
        error.debugDetails = error.debugDetails || {
            message: error?.message,
            name: error?.name,
            endpoint,
            fileName: file?.name,
            fileType: file?.type,
            fileSize: file?.size,
            navigatorOnline: typeof navigator !== "undefined" ? navigator.onLine : undefined,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            likelyCause: isNetworkLoadError(error)
                ? "Browser/network failed before receiving an HTTP response from Cloudinary."
                : "Cloudinary upload failed before returning a handled response.",
        };
        logBulkUploadDebug("Cloudinary upload failed", {
            source: error.source,
            debugDetails: error.debugDetails,
            error,
        });
        throw error;
    }
};

const pairFiles = (files) => {
    const fileMap = new Map();
    const unsupported = [];

    Array.from(files || []).forEach((file) => {
        const extension = getExtension(file.name);
        const key = normalizePairingKey(file.name);

        if (!key) {
            unsupported.push({ name: file.name, reason: "Nombre no valido" });
            return;
        }

        if (!fileMap.has(key)) {
            fileMap.set(key, {
                key,
                baseName: stripExtension(file.name),
                image: null,
                video: null,
                duplicates: [],
            });
        }

        const entry = fileMap.get(key);

        if (SUPPORTED_IMAGE_TYPES.includes(extension)) {
            if (entry.image) {
                entry.duplicates.push(file.name);
            } else {
                entry.image = file;
            }
            return;
        }

        if (SUPPORTED_VIDEO_TYPES.includes(extension)) {
            if (entry.video) {
                entry.duplicates.push(file.name);
            } else {
                entry.video = file;
            }
            return;
        }

        unsupported.push({ name: file.name, reason: "Formato no soportado" });
    });

    const matchedPairs = [];
    const unmatched = [];
    const duplicates = [];

    fileMap.forEach((entry) => {
        if (entry.duplicates.length) {
            duplicates.push({ name: entry.baseName, duplicates: entry.duplicates });
        }

        if (entry.image && entry.video) {
            matchedPairs.push({
                key: entry.key,
                baseName: entry.baseName,
                draftName: buildExerciseCode(entry.baseName),
                image: entry.image,
                video: entry.video,
            });
            return;
        }

        unmatched.push({
            name: entry.baseName,
            missing: entry.image ? "video" : "image",
        });
    });

    matchedPairs.sort((a, b) => a.draftName.localeCompare(b.draftName, undefined, { numeric: true }));

    return { matchedPairs, unmatched, duplicates, unsupported };
};

const initialProgress = {
    currentIndex: 0,
    total: 0,
    currentName: "",
    currentStep: "",
    completed: 0,
    failed: 0,
};

export default function BulkUploadExercisesPage() {
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [selectedImageFiles, setSelectedImageFiles] = useState([]);
    const [selectedVideoFiles, setSelectedVideoFiles] = useState([]);
    const [rows, setRows] = useState([]);
    const [progress, setProgress] = useState(initialProgress);
    const [isProcessing, setIsProcessing] = useState(false);
    const [summaryMessage, setSummaryMessage] = useState("");
    const [fatalError, setFatalError] = useState("");
    const [shouldStop, setShouldStop] = useState(false);
    const stopRequestedRef = useRef(false);

    const pairingResult = useMemo(
        () => pairFiles([...selectedImageFiles, ...selectedVideoFiles]),
        [selectedImageFiles, selectedVideoFiles]
    );
    const canStart =
        pairingResult.matchedPairs.length > 0 &&
        !isProcessing &&
        token &&
        backendUrl &&
        cloudName &&
        videoUploadPreset &&
        imageUploadPreset;

    const resetProcessState = () => {
        setSummaryMessage("");
        setFatalError("");
        setRows([]);
        setProgress(initialProgress);
        setShouldStop(false);
        stopRequestedRef.current = false;
    };

    const handleImagesChange = (event) => {
        const files = Array.from(event.target.files || []);
        setSelectedImageFiles(files);
        resetProcessState();
    };

    const handleVideosChange = (event) => {
        const files = Array.from(event.target.files || []);
        setSelectedVideoFiles(files);
        resetProcessState();
    };

    const createExercise = async ({ name, imageUrl, videoUrl }) => {
        const payload = {
            name,
            code: name,
            description: "",
            image: imageUrl,
            video: videoUrl,
            active: false,
            group: "",
            instructions: "",
            box: "",
            unilateral: false,
            head_position: "",
            tags: [],
            springs: [],
            position: null,
            prop: null,
            machine: null,
        };

        const requestUrl = `${backendUrl}/api/data/exercises/`;
        logBulkUploadDebug("Backend exercise create started", {
            requestUrl,
            payload,
            hasToken: Boolean(token),
        });

        try {
            const response = await axios.post(requestUrl, payload, {
                headers: { Authorization: `Token ${token}` },
            });

            logBulkUploadDebug("Backend exercise create response", {
                status: response.status,
                statusText: response.statusText,
                data: response.data,
            });
        } catch (error) {
            error.source = "backend:createExercise";
            error.debugDetails = buildAxiosDebugDetails(error);
            logBulkUploadDebug("Backend exercise create failed", error.debugDetails);
            throw error;
        }
    };

    const updateRow = (key, patch) => {
        setRows((currentRows) =>
            currentRows.map((row) => (row.key === key ? { ...row, ...patch } : row))
        );
    };

    const startUpload = async () => {
        setIsProcessing(true);
        setShouldStop(false);
        stopRequestedRef.current = false;
        setSummaryMessage("");
        setFatalError("");

        const initialRows = pairingResult.matchedPairs.map((pair) => ({
            key: pair.key,
            name: pair.draftName,
            originalBaseName: pair.baseName,
            status: "Pendiente",
            detail: "",
        }));

        setRows(initialRows);
        setProgress({
            currentIndex: 0,
            total: pairingResult.matchedPairs.length,
            currentName: "",
            currentStep: "",
            completed: 0,
            failed: 0,
        });

        let completed = 0;
        let failed = 0;

        try {
            for (let index = 0; index < pairingResult.matchedPairs.length; index += 1) {
                if (stopRequestedRef.current) {
                    break;
                }

                const pair = pairingResult.matchedPairs[index];
                const timestamp = Date.now();
                const cloudinaryBaseName = buildCloudinaryBaseName(pair.baseName, timestamp);

                logBulkUploadDebug("Processing pair", {
                    index: index + 1,
                    total: pairingResult.matchedPairs.length,
                    exerciseName: pair.draftName,
                    originalBaseName: pair.baseName,
                    imageFile: {
                        name: pair.image?.name,
                        type: pair.image?.type,
                        size: pair.image?.size,
                    },
                    videoFile: {
                        name: pair.video?.name,
                        type: pair.video?.type,
                        size: pair.video?.size,
                    },
                    cloudinaryBaseName,
                });

                setProgress({
                    currentIndex: index + 1,
                    total: pairingResult.matchedPairs.length,
                    currentName: pair.draftName,
                    currentStep: "Subiendo video",
                    completed,
                    failed,
                });
                updateRow(pair.key, { status: "Procesando", detail: "Subiendo video" });

                try {
                    const videoUrl = await uploadToCloudinaryWithBaseName(pair.video, "video", cloudinaryBaseName);

                    setProgress((prev) => ({
                        ...prev,
                        currentStep: "Subiendo imagen",
                    }));
                    updateRow(pair.key, { status: "Procesando", detail: "Subiendo imagen" });

                    const imageUrl = await uploadToCloudinaryWithBaseName(pair.image, "image", cloudinaryBaseName);

                    setProgress((prev) => ({
                        ...prev,
                        currentStep: "Creando ejercicio en servidor",
                    }));
                    updateRow(pair.key, { status: "Procesando", detail: "Creando ejercicio en servidor" });

                    await createExercise({
                        name: pair.draftName,
                        imageUrl,
                        videoUrl,
                    });

                    completed += 1;
                    updateRow(pair.key, { status: "Creado", detail: "Ejercicio creado correctamente" });
                    setProgress((prev) => ({
                        ...prev,
                        completed,
                    }));
                } catch (error) {
                    failed += 1;
                    const source = error?.source || "unknown";
                    const detail = `${source}: ${getReadableErrorMessage(error)}`;

                    logBulkUploadDebug("Pair failed", {
                        source,
                        exerciseName: pair.draftName,
                        originalBaseName: pair.baseName,
                        message: error?.message,
                        debugDetails: error?.debugDetails,
                        error,
                    });

                    updateRow(pair.key, { status: "Error", detail });
                    setProgress((prev) => ({
                        ...prev,
                        failed,
                        currentStep: "Error",
                    }));
                }
            }

            const stoppedMessage = stopRequestedRef.current ? "Proceso detenido por el usuario." : "";
            setSummaryMessage(
                `${stoppedMessage} Creados: ${completed}. Fallidos: ${failed}. Coincidencias procesables: ${pairingResult.matchedPairs.length}.`
                    .trim()
            );
        } catch (error) {
            setFatalError(error?.message || "Error inesperado durante la carga masiva.");
        } finally {
            setIsProcessing(false);
            setProgress((prev) => ({
                ...prev,
                currentName: "",
                currentStep: stopRequestedRef.current ? "Proceso detenido" : "",
                completed,
                failed,
            }));
            setShouldStop(false);
            stopRequestedRef.current = false;
        }
    };

    return (
        <MainPage>
            <Head>
                <title>Beness App | Carga Masiva de Ejercicios</title>
            </Head>

            <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 4 } }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Carga Masiva de Ejercicios
                        </Typography>
                        <Typography color="text.secondary">
                            Selecciona imagenes y videos juntos. La pagina los empareja por nombre, los sube de uno en uno a Cloudinary y despues crea cada ejercicio en el servidor.
                        </Typography>
                    </Box>

                    {!token && <Alert severity="warning">No se encontro el token de sesion. Inicia sesion antes de usar esta pagina.</Alert>}
                    {!backendUrl && <Alert severity="error">Falta la variable `NEXT_PUBLIC_BACKEND_URL`.</Alert>}
                    {(!cloudName || !videoUploadPreset || !imageUploadPreset) && (
                        <Alert severity="error">Faltan las variables de Cloudinary en el frontend.</Alert>
                    )}
                    {fatalError && <Alert severity="error">{fatalError}</Alert>}
                    {summaryMessage && <Alert severity="info">{summaryMessage}</Alert>}
                    <Alert severity="info">
                        Debug activo: abre la consola del navegador y filtra por {BULK_UPLOAD_DEBUG_PREFIX} para ver respuestas de Cloudinary y del backend.
                    </Alert>

                    <Paper sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h6">1. Seleccion de archivos</Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <Button variant="contained" component="label" disabled={isProcessing}>
                                    Seleccionar imagenes
                                    <input
                                        hidden
                                        multiple
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImagesChange}
                                    />
                                </Button>
                                <Button variant="contained" component="label" disabled={isProcessing}>
                                    Seleccionar videos
                                    <input
                                        hidden
                                        multiple
                                        type="file"
                                        accept="video/*"
                                        onChange={handleVideosChange}
                                    />
                                </Button>
                            </Stack>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`Imagenes seleccionadas: ${selectedImageFiles.length}`} />
                                <Chip label={`Videos seleccionados: ${selectedVideoFiles.length}`} />
                                <Chip label={`Coincidencias validas: ${pairingResult.matchedPairs.length}`} color="success" />
                                <Chip label={`Sin pareja: ${pairingResult.unmatched.length}`} color="warning" />
                                <Chip label={`No soportados: ${pairingResult.unsupported.length}`} color="default" />
                            </Stack>

                            <Typography variant="body2" color="text.secondary">
                                Recomendacion practica: 20-30 ejercicios por tanda. Esta pagina procesa uno por uno para priorizar estabilidad.
                            </Typography>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h6">2. Proceso</Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <Button variant="contained" disabled={!canStart} onClick={startUpload}>
                                    Empezar carga
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    disabled={!isProcessing}
                                    onClick={() => {
                                        setShouldStop(true);
                                        stopRequestedRef.current = true;
                                    }}
                                >
                                    Detener al finalizar el actual
                                </Button>
                            </Stack>

                            <LinearProgress
                                variant={progress.total ? "determinate" : "indeterminate"}
                                value={progress.total ? (progress.currentIndex / progress.total) * 100 : 0}
                            />

                            <Typography variant="body2">
                                {isProcessing
                                    ? `Creando ${progress.currentIndex} de ${progress.total}${progress.currentName ? `: ${progress.currentName}` : ""}${progress.currentStep ? ` | ${progress.currentStep}` : ""}`
                                    : "Proceso inactivo"}
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`Creados: ${progress.completed}`} color="success" />
                                <Chip label={`Fallidos: ${progress.failed}`} color="error" />
                            </Stack>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h6">3. Coincidencias detectadas</Typography>
                            {pairingResult.matchedPairs.length === 0 ? (
                                <Typography color="text.secondary">Aun no hay pares validos para procesar.</Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Nombre original</TableCell>
                                                <TableCell>Codigo / nombre inicial</TableCell>
                                                <TableCell>Imagen</TableCell>
                                                <TableCell>Video</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pairingResult.matchedPairs.map((pair) => (
                                                <TableRow key={pair.key}>
                                                    <TableCell>{pair.baseName}</TableCell>
                                                    <TableCell>{pair.draftName}</TableCell>
                                                    <TableCell>{pair.image.name}</TableCell>
                                                    <TableCell>{pair.video.name}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h6">4. Resultado por ejercicio</Typography>
                            {rows.length === 0 ? (
                                <Typography color="text.secondary">Aqui aparecera el estado de cada ejercicio cuando empiece el proceso.</Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Ejercicio</TableCell>
                                                <TableCell>Estado</TableCell>
                                                <TableCell>Detalle</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((row) => (
                                                <TableRow key={row.key}>
                                                    <TableCell>{row.name}</TableCell>
                                                    <TableCell>{row.status}</TableCell>
                                                    <TableCell>{row.detail}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Stack>
                    </Paper>

                    {(pairingResult.unmatched.length > 0 || pairingResult.unsupported.length > 0 || pairingResult.duplicates.length > 0) && (
                        <Paper sx={{ p: 3 }}>
                            <Stack spacing={2}>
                                <Typography variant="h6">5. Archivos no procesables</Typography>

                                {pairingResult.unmatched.length > 0 && (
                                    <Box>
                                        <Typography sx={{ fontWeight: 600, mb: 1 }}>Sin pareja</Typography>
                                        <Stack spacing={1}>
                                            {pairingResult.unmatched.map((item) => (
                                                <Typography key={`${item.name}-${item.missing}`} variant="body2">
                                                    {item.name} - falta {item.missing}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {pairingResult.duplicates.length > 0 && (
                                    <Box>
                                        <Typography sx={{ fontWeight: 600, mb: 1 }}>Duplicados</Typography>
                                        <Stack spacing={1}>
                                            {pairingResult.duplicates.map((item) => (
                                                <Typography key={item.name} variant="body2">
                                                    {item.name} - archivos extra: {item.duplicates.join(", ")}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {pairingResult.unsupported.length > 0 && (
                                    <Box>
                                        <Typography sx={{ fontWeight: 600, mb: 1 }}>No soportados</Typography>
                                        <Stack spacing={1}>
                                            {pairingResult.unsupported.map((item) => (
                                                <Typography key={`${item.name}-${item.reason}`} variant="body2">
                                                    {item.name} - {item.reason}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </Stack>
                        </Paper>
                    )}
                </Stack>
            </Box>
        </MainPage>
    );
}

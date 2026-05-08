import { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    CircularProgress
} from "@mui/material";
import axios from "axios";

export default function SessionLogsDialog({ open, onClose, sessionId, sessionName, token, backendUrl }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && sessionId) {
            fetchLogs();
        }
    }, [open, sessionId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/routine-session-logs/?routine_session=${sessionId}`,
                { headers: { Authorization: `Token ${token}` } }
            );
            // Sin paginación, la respuesta es directamente el array
            setLogs(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error al obtener los logs:", error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                Logs de la sesión
                {sessionName && (
                    <Typography variant="body2" color="textSecondary">
                        {sessionName}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : logs.length === 0 ? (
                    <Box p={3} textAlign="center">
                        <Typography variant="body1" color="textSecondary">
                            No hay logs para esta sesión
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Fecha</strong></TableCell>
                                    <TableCell><strong>Usuario</strong></TableCell>
                                    <TableCell><strong>Ejercicio</strong></TableCell>
                                    <TableCell><strong>Log</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {formatDate(log.created_at)}
                                        </TableCell>
                                        <TableCell>{log.user_name || 'N/A'}</TableCell>
                                        <TableCell>{log.exercise_name || '-'}</TableCell>
                                        <TableCell sx={{ 
                                            maxWidth: 400, 
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {log.log}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}

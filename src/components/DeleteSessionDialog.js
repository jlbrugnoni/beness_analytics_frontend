import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

export default function DeleteSessionDialog({
    open,
    onClose,
    onDeleteSingle,
    onDeleteSeries,
    session,
    loading = false
}) {
    if (!session) return null;

    const hasSeries = session.session_series?.id;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" />
                Confirmar Eliminación
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" gutterBottom>
                        ¿Estás seguro de que deseas eliminar esta sesión?
                    </Typography>
                    <Box sx={{ 
                        backgroundColor: '#f5f5f5', 
                        p: 2, 
                        borderRadius: 1,
                        mt: 2 
                    }}>
                        <Typography variant="subtitle2" color="primary">
                            {session.name || 'Sesión sin nombre'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            📅 {session.scheduled_at}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            👤 Monitor: {session.user || 'Sin asignar'}
                        </Typography>
                        {session.routine && (
                            <Typography variant="body2" color="textSecondary">
                                📋 Clase: {session.routine}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {hasSeries && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            Esta sesión pertenece a la serie: <strong>{session.session_series.name}</strong>
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Puedes eliminar solo esta sesión o esta y todas las posteriores de la serie.
                        </Typography>
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button 
                    onClick={onClose} 
                    variant="outlined"
                    disabled={loading}
                >
                    Cancelar
                </Button>
                
                {hasSeries && (
                    <Button
                        onClick={onDeleteSeries}
                        variant="contained"
                        color="warning"
                        startIcon={<DeleteSweepIcon />}
                        disabled={loading}
                    >
                        Eliminar serie completa (a partir de está sesión)
                    </Button>
                )}
                
                <Button
                    onClick={onDeleteSingle}
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    disabled={loading}
                >
                    {hasSeries ? 'Eliminar solo esta' : 'Eliminar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

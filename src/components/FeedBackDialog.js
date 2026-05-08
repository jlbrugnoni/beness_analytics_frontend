import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Box
} from '@mui/material';

export default function FeedbackDialog({ open, onClose, onSave, session, currentUserId }) {
    const [feedback, setFeedback] = useState('');
    
    const canEdit = session && currentUserId && session.user_id == currentUserId;

    useEffect(() => {
        if (session) {
            setFeedback(session.userFeedback || '');
        } else {
            setFeedback('');
        }
    }, [session]);
    
    useEffect(() => {
        if (!open) {
            setFeedback('');
        }
    }, [open]);

    const handleSave = () => {
        if (!canEdit) {
            alert('No tienes permisos para editar el feedback de esta sesión.');
            return;
        }
        onSave(feedback);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Feedback de la sesión
                {session && (
                    <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                        {session.routine} - {session.scheduled_at}                       
                    </div>
                )}
            </DialogTitle>
            <DialogContent>
                              
                <TextField
                    autoFocus={canEdit}
                    margin="dense"
                    label="Comentarios sobre la sesión"
                    multiline
                    rows={5}
                    fullWidth
                    variant="outlined"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={canEdit ? "Añade tus comentarios sobre cómo fue la sesión..." : ""}
                    disabled={!canEdit} // ✅ Deshabilitar si no puede editar
                    InputProps={{
                        readOnly: !canEdit
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    {canEdit ? 'Cancelar' : 'Cerrar'}
                </Button>
                {canEdit && (
                    <Button onClick={handleSave} variant="contained">
                        Guardar
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { Warning } from "@mui/icons-material";

export default function WarningModal({
  open,
  message,
  onConfirm,
  onCancel,
  title = "Confirm Action",
  confirmText = "Confirm",
  cancelText = "Cancel",
}) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const getIconColor = () => {
    return "#ff9800";
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="warning-dialog-title"
      aria-describedby="warning-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="warning-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <Warning sx={{ color: getIconColor() }} />
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText id="warning-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ padding: "16px 24px" }}>
        <Button onClick={handleCancel} color="inherit" variant="outlined">
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={"warning"}
          variant="contained"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

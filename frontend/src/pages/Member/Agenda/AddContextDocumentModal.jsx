import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  styled,
} from "@mui/material";
import { Upload, Description } from "@mui/icons-material";

export default function AddContextDocumentModal({
  open,
  onClose,
  onAddDocument,
}) {
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (fileName && description) {
      onAddDocument({ fileName, description });
      setFileName("");
      setDescription("");
      onClose();
    }
  };

  const handleClose = () => {
    setFileName("");
    setDescription("");
    onClose();
  };

  const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Description color="primary" />
          <Typography variant="h6">Add Context Document</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          <TextField
            fullWidth
            label="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter document name..."
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter document description..."
            multiline
            rows={3}
          />

          <Button
            component="label"
            role={undefined}
            startIcon={
              <Upload sx={{ fontSize: 32, color: "#8B5CF6", mb: 1 }} />
            }
            sx={{
              p: 3,
              border: "2px dashed #E5E7EB",
              borderRadius: 2,
              textAlign: "center",
              backgroundColor: "#F9FAFB",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Drag and drop files here or click to browse
            </Typography>
            <VisuallyHiddenInput
              type="file"
              onChange={(event) => console.log(event.target.files)}
              multiple
            />
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!fileName || !description}
          sx={{
            backgroundColor: "#8B5CF6",
            "&:hover": {
              backgroundColor: "#7C3AED",
            },
          }}
        >
          Add Document
        </Button>
      </DialogActions>
    </Dialog>
  );
}

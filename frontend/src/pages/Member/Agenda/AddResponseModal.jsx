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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Upload } from "@mui/icons-material";

export default function AddResponseModal({ open, onClose, onAddGroup }) {
  const [fileName, setFileName] = useState("");
  const [format, setFormat] = useState("");

  const handleSubmit = () => {
    if (fileName && format) {
      onAddGroup({ fileName, format });
      setFileName("");
      setFormat("");
      onClose();
    }
  };

  const handleClose = () => {
    setFileName("");
    setFormat("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Upload color="primary" />
          <Typography variant="h6">Add Response Group</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          <TextField
            fullWidth
            label="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter response group name..."
          />

          <FormControl fullWidth>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              label="Format"
            >
              <MenuItem value="CSV">CSV</MenuItem>
              <MenuItem value="PDF">PDF</MenuItem>
              <MenuItem value="DOCX">DOCX</MenuItem>
              <MenuItem value="TXT">TXT</MenuItem>
              <MenuItem value="JSON">JSON</MenuItem>
            </Select>
          </FormControl>

          <Box
            sx={{
              p: 3,
              border: "2px dashed #E5E7EB",
              borderRadius: 2,
              textAlign: "center",
              backgroundColor: "#F9FAFB",
            }}
          >
            <Upload sx={{ fontSize: 32, color: "#8B5CF6", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Drag and drop files here or click to browse
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!fileName || !format}
          sx={{
            backgroundColor: "#8B5CF6",
            "&:hover": {
              backgroundColor: "#7C3AED",
            },
          }}
        >
          Add Response Group
        </Button>
      </DialogActions>
    </Dialog>
  );
}

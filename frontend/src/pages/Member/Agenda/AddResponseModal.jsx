import { useState } from "react";
import { useParams } from "react-router-dom";
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
  LinearProgress,
} from "@mui/material";
import { Upload } from "@mui/icons-material";
import { fetchAuthSession } from "aws-amplify/auth";

export default function AddResponseModal({ open, onClose, onAddGroup }) {
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const { agendaId } = useParams();
  //const [description, setDescription] = useState("");

  const allowedFileTypes = [".csv", ".mp3", ".pdf", ".docx", ".txt"];
  const allowedMimeTypes = [
    "text/csv",
    "audio/mpeg",
    "audio/mp3",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  // File size limits in bytes
  const fileSizeLimits = {
    ".csv": 50 * 1024 * 1024, // 50MB
    ".txt": 50 * 1024 * 1024, // 50MB
    ".docx": 50 * 1024 * 1024, // 50MB
    ".pdf": 25 * 1024 * 1024, // 25MB
    ".mp3": 100 * 1024 * 1024, // 100MB
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;

    const fileExtension =
      "." + selectedFile.name.split(".").pop().toLowerCase();
    const isValidType =
      allowedFileTypes.includes(fileExtension) ||
      allowedMimeTypes.includes(selectedFile.type);

    if (!isValidType) {
      setFileError(
        "Please select a valid file type: CSV, MP3, PDF, DOCX, or TXT"
      );
      return false;
    }

    // Check file size
    const maxSize = fileSizeLimits[fileExtension];
    if (maxSize && selectedFile.size > maxSize) {
      setFileError(
        `File size (${formatFileSize(
          selectedFile.size
        )}) exceeds the limit of ${formatFileSize(
          maxSize
        )} for ${fileExtension.toUpperCase()} files`
      );
      return false;
    }

    setFileError("");
    return true;
  };

  const sanitizeFileName = (name) => {
    if (!name) return name;

    // Split filename and extension
    const lastDotIndex = name.lastIndexOf(".");
    const nameWithoutExt =
      lastDotIndex > 0 ? name.substring(0, lastDotIndex) : name;
    const extension = lastDotIndex > 0 ? name.substring(lastDotIndex) : "";

    // Remove or replace problematic characters
    // Keep only alphanumeric, hyphens, underscores, and periods
    const sanitizedName = nameWithoutExt
      .replace(/[^a-zA-Z0-9\-_]/g, "_") // Replace any non-alphanumeric (except - and _) with underscore
      .replace(/_{2,}/g, "_") // Replace multiple consecutive underscores with single underscore
      .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores

    // Ensure we don't end up with an empty name
    const finalName = sanitizedName || "file";

    return finalName + extension.toLowerCase();
  };

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;
    const sanitizedFileName = sanitizeFileName(fileName);

    try {
      if (file) {
        // Get presigned URL - encode the filename for the URL parameter
        const urlResponse = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }upload-url?file_name=${encodeURIComponent(
            sanitizedFileName
          )}&file_type=${
            file.type
          }&agenda_id=${agendaId}&document_type=observation`,
          {
            headers: {
              Authorization: token,
            },
          }
        );
        const { presignedurl, key } = await urlResponse.json();

        // Update agenda with S3 key
        await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }agenda/${agendaId}/research-observation`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              document_name: sanitizedFileName,
              file_path: key,
              //description: description,
              upload_status: "processing",
            }),
          }
        );
        // Upload to S3
        await fetch(presignedurl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        setLoading(false);
      }

      onAddGroup({
        document_name: sanitizedFileName,
        format: file.type,
        upload_status: "processing",
      });
    } catch (error) {
      console.error("Error uploading response group:", error);
      onAddGroup({
        document_name: sanitizedFileName,
        format: file.type,
        upload_status: "failed",
      });
    }

    setFileName("");
    setFile(null);
    onClose();
  };

  const handleClose = () => {
    setFileName("");
    setFile(null);
    setFileError("");
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
          <Upload color="primary" />
          <Typography variant="h6">Add Response Group</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          <TextField
            fullWidth
            label="File Name"
            disabled={loading}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter response group name..."
          />
          {/*
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter document description..."
            multiline
            rows={3}
          />
          */}
          <Button
            component="label"
            role={undefined}
            disabled={loading}
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
              {file ? file.name : "Drag and drop files here or click to browse"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: CSV, MP3, PDF, DOCX, TXT
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.7rem" }}
            >
              Max sizes: CSV/TXT/DOCX (50MB), PDF (25MB), MP3 (100MB)
            </Typography>
            <VisuallyHiddenInput
              type="file"
              onChange={(event) => {
                const selectedFile = event.target.files[0];
                if (selectedFile && validateFile(selectedFile)) {
                  setFile(selectedFile);
                  setFileName(selectedFile.name);
                } else {
                  setFile(null);
                  setFileName("");
                }
              }}
              multiple
            />
          </Button>
          {fileError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {fileError}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!fileName || !file || loading}
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
      <LinearProgress hidden={!loading} />
    </Dialog>
  );
}

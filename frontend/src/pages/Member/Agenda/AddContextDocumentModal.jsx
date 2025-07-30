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
} from "@mui/material";
import { Upload, Description } from "@mui/icons-material";
import { fetchAuthSession } from "aws-amplify/auth";

export default function AddContextDocumentModal({
  open,
  onClose,
  onAddDocument,
}) {
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const { agendaId } = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;
    const payload = JSON.parse(atob(token.toString().split(".")[1]));
    const cognito_id = payload.sub;

    if (file) {
      // Get presigned URL
      const urlResponse = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}upload-url?file_name=${
          file.name
        }&file_type=${file.type}&agenda_id=${agendaId}&document_type=context`,
        {
          headers: {
            Authorization: token,
          },
        }
      );
      const { presignedurl, key } = await urlResponse.json();

      // Upload to S3
      await fetch(presignedurl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Update agenda with S3 key
      await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }agenda/${agendaId}/context-document`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document_name: fileName,
            file_path: key,
            description: description,
            upload_status: "uploaded",
          }),
        }
      );
    }

    onAddDocument({ document_name: fileName, description });
    setFileName("");
    setDescription("");
    setFile(null);
    onClose();
  };

  const handleClose = () => {
    setFileName("");
    setDescription("");
    setFile(null);
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
              {file ? file.name : "Drag and drop files here or click to browse"}
            </Typography>
            <VisuallyHiddenInput
              type="file"
              hidden
              onChange={(event) => setFile(event.target.files[0])}
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
          disabled={!fileName || !file}
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

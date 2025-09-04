import React, { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Divider,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export default function AgendaForm() {
  const navigate = useNavigate();
  const [fileError, setFileError] = useState("");

  const [agenda, setAgenda] = useState({
    agenda_name: "",
    metric_name: "",
    metric_description: "",
    context_documents: [],
    research_observations: [],
  });

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

  const addContextDoc = () => {
    setAgenda((prev) => ({
      ...prev,
      context_documents: [
        ...prev.context_documents,
        { document_name: "", file: null, description: "" },
      ],
    }));
  };

  const addObservation = () => {
    setAgenda((prev) => ({
      ...prev,
      research_observations: [
        ...prev.research_observations,
        { document_name: "", file: null },
      ],
    }));
  };

  const updateField = (field, value) => {
    setAgenda((prev) => ({ ...prev, [field]: value }));
  };

  const updateContextDoc = (index, field, value) => {
    const docs = [...agenda.context_documents];
    docs[index][field] = value;
    setAgenda((prev) => ({ ...prev, context_documents: docs }));
  };

  const updateObservation = (index, field, value) => {
    const obs = [...agenda.research_observations];
    obs[index][field] = value;
    setAgenda((prev) => ({ ...prev, research_observations: obs }));
  };

  const removeContextDoc = (index) => {
    setAgenda((prev) => ({
      ...prev,
      context_documents: prev.context_documents.filter((_, i) => i !== index),
    }));
  };

  const removeObservation = (index) => {
    setAgenda((prev) => ({
      ...prev,
      research_observations: prev.research_observations.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;
    const payload = JSON.parse(atob(token.toString().split(".")[1]));
    const cognito_id = payload.sub;

    // First create the agenda to get agenda_id
    const agendaData = {
      agenda_name: agenda.agenda_name,
      metric_name: agenda.metric_name,
      metric_description: agenda.metric_description,
      cognito_id: cognito_id,
      context_documents: [],
      research_observations: [],
    };

    const agendaResponse = await fetch(
      `${import.meta.env.VITE_API_ENDPOINT}agenda`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agendaData),
      }
    );

    const { agenda_id } = await agendaResponse.json();

    // Upload context documents
    for (const doc of agenda.context_documents) {
      if (doc.file) {
        const sanitizedFileName = sanitizeFileName(doc.document_name);

        // Get presigned URL - encode the filename for the URL parameter
        const urlResponse = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }upload-url?file_name=${encodeURIComponent(
            sanitizedFileName
          )}&file_type=${
            doc.file.type
          }&agenda_id=${agenda_id}&document_type=context`,
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
          }agenda/${agenda_id}/context-document`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              document_name: sanitizedFileName,
              file_path: key,
              description: doc.description,
              upload_status: "processing",
            }),
          }
        );

        // Upload to S3
        await fetch(presignedurl, {
          method: "PUT",
          body: doc.file,
          headers: { "Content-Type": doc.file.type },
        });
      }
    }

    // Upload research observations
    for (const obs of agenda.research_observations) {
      if (obs.file) {
        const sanitizedFileName = sanitizeFileName(obs.document_name);

        // Get presigned URL - encode the filename for the URL parameter
        const urlResponse = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }upload-url?file_name=${encodeURIComponent(
            sanitizedFileName
          )}&file_type=${
            obs.file.type
          }&agenda_id=${agenda_id}&document_type=observation`,
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
          }agenda/${agenda_id}/research-observation`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              document_name: sanitizedFileName,
              file_path: key,
              upload_status: "processing",
            }),
          }
        );

        // Upload to S3
        await fetch(presignedurl, {
          method: "PUT",
          body: obs.file,
          headers: { "Content-Type": obs.file.type },
        });
      }
    }

    alert("Agenda created successfully!");
    navigate(`/agenda/${agenda_id}/chat`);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "visible",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: "#000000",
                mb: 4,
              }}
            >
              Create New Research Agenda
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={4}>
                {/* Basic Information */}
                <Stack spacing={3}>
                  <TextField
                    label="Agenda Name"
                    value={agenda.agenda_name}
                    onChange={(e) => updateField("agenda_name", e.target.value)}
                    required
                    fullWidth
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />

                  <TextField
                    label="Metric Name"
                    value={agenda.metric_name}
                    onChange={(e) => updateField("metric_name", e.target.value)}
                    required
                    fullWidth
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />

                  <TextField
                    label="Metric Description"
                    value={agenda.metric_description}
                    onChange={(e) =>
                      updateField("metric_description", e.target.value)
                    }
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* Context Documents */}
                <Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ color: "text.primary", mb: 3 }}
                  >
                    Context Documents
                  </Typography>

                  <Stack spacing={2}>
                    {agenda.context_documents.map((doc, index) => (
                      <Paper
                        key={index}
                        elevation={1}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: "grey.50",
                          border: "1px solid",
                          borderColor: "grey.200",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            borderColor: "primary.main",
                            backgroundColor: "primary.50",
                          },
                        }}
                      >
                        <Stack spacing={2}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <TextField
                              label="Document Name"
                              value={doc.document_name}
                              onChange={(e) =>
                                updateContextDoc(
                                  index,
                                  "document_name",
                                  e.target.value
                                )
                              }
                              fullWidth
                              size="small"
                              variant="outlined"
                            />
                            {agenda.context_documents.length > 1 && (
                              <IconButton
                                onClick={() => removeContextDoc(index)}
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>

                          <Box>
                            <Button
                              component="label"
                              variant="outlined"
                              startIcon={<UploadIcon />}
                              sx={{
                                justifyContent: "flex-start",
                                textAlign: "left",
                                borderStyle: "dashed",
                                py: 1.5,
                                width: "100%",
                              }}
                            >
                              {doc.file ? doc.file.name : "Choose File"}
                              <input
                                type="file"
                                hidden
                                onChange={(e) => {
                                  const selectedFile = e.target.files?.[0];
                                  if (
                                    selectedFile &&
                                    validateFile(selectedFile)
                                  ) {
                                    updateContextDoc(
                                      index,
                                      "file",
                                      selectedFile
                                    );
                                    updateContextDoc(
                                      index,
                                      "document_name",
                                      selectedFile.name
                                    );
                                  } else {
                                    updateContextDoc(index, "file", null);
                                    updateContextDoc(
                                      index,
                                      "document_name",
                                      ""
                                    );
                                  }
                                }}
                              />
                            </Button>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                mt: 0.5,
                                fontSize: "0.7rem",
                              }}
                            >
                              Supported: CSV, MP3, PDF, DOCX, TXT | Max sizes:
                              CSV/TXT/DOCX (50MB), PDF (25MB), MP3 (100MB)
                            </Typography>
                          </Box>

                          <TextField
                            label="Description"
                            value={doc.description}
                            onChange={(e) =>
                              updateContextDoc(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            multiline
                            rows={2}
                            fullWidth
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Paper>
                    ))}

                    <Button
                      onClick={addContextDoc}
                      variant="outlined"
                      startIcon={<AddIcon />}
                      sx={{
                        alignSelf: "flex-start",
                        borderRadius: 2,
                        px: 3,
                      }}
                    >
                      Add Context Document
                    </Button>
                  </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Research Observations */}
                <Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ color: "text.primary", mb: 3 }}
                  >
                    Research Observations
                  </Typography>

                  <Stack spacing={2}>
                    {agenda.research_observations.map((obs, index) => (
                      <Paper
                        key={index}
                        elevation={1}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: "grey.50",
                          border: "1px solid",
                          borderColor: "grey.200",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            borderColor: "primary.main",
                            backgroundColor: "primary.50",
                          },
                        }}
                      >
                        <Stack spacing={2}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <TextField
                              label="Document Name"
                              value={obs.document_name}
                              onChange={(e) =>
                                updateObservation(
                                  index,
                                  "document_name",
                                  e.target.value
                                )
                              }
                              fullWidth
                              size="small"
                              variant="outlined"
                            />
                            {agenda.research_observations.length > 1 && (
                              <IconButton
                                onClick={() => removeObservation(index)}
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>

                          <Box>
                            <Button
                              component="label"
                              variant="outlined"
                              startIcon={<UploadIcon />}
                              sx={{
                                justifyContent: "flex-start",
                                textAlign: "left",
                                borderStyle: "dashed",
                                py: 1.5,
                                width: "100%",
                              }}
                            >
                              {obs.file ? obs.file.name : "Choose File"}
                              <input
                                type="file"
                                hidden
                                onChange={(e) => {
                                  const selectedFile = e.target.files?.[0];
                                  if (
                                    selectedFile &&
                                    validateFile(selectedFile)
                                  ) {
                                    updateObservation(
                                      index,
                                      "file",
                                      selectedFile
                                    );
                                    updateObservation(
                                      index,
                                      "document_name",
                                      selectedFile.name
                                    );
                                  } else {
                                    updateObservation(index, "file", null);
                                    updateObservation(
                                      index,
                                      "document_name",
                                      ""
                                    );
                                  }
                                }}
                              />
                            </Button>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                mt: 0.5,
                                fontSize: "0.7rem",
                              }}
                            >
                              Supported: CSV, MP3, PDF, DOCX, TXT | Max sizes:
                              CSV/TXT/DOCX (50MB), PDF (25MB), MP3 (100MB)
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}

                    <Button
                      onClick={addObservation}
                      variant="outlined"
                      startIcon={<AddIcon />}
                      sx={{
                        alignSelf: "flex-start",
                        borderRadius: 2,
                        px: 3,
                      }}
                    >
                      Add Observation
                    </Button>
                  </Stack>
                </Box>

                {/* Error Display */}
                {fileError && (
                  <Box sx={{ pt: 1 }}>
                    <Typography variant="body2" color="error">
                      {fileError}
                    </Typography>
                  </Box>
                )}

                {/* Submit Button */}
                <Box sx={{ pt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{
                      backgroundColor: "#8B5CF6",
                      borderRadius: 2,
                      textTransform: "none",
                      px: 3,
                      "&:hover": {
                        backgroundColor: "#7C3AED",
                      },
                    }}
                  >
                    Create Research Agenda
                  </Button>
                </Box>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

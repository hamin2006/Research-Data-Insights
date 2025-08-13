import React, { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import ResearcherNavbar from "../../components/ResearcherNavbar";
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

  const [agenda, setAgenda] = useState({
    agenda_name: "",
    metric_name: "",
    metric_description: "",
    context_documents: [],
    research_observations: [],
  });

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
        // Get presigned URL
        const urlResponse = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}upload-url?file_name=${
            doc.file.name
          }&file_type=${
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
              document_name: doc.document_name,
              file_path: key,
              description: doc.description,
              upload_status: "uploaded",
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
        // Get presigned URL
        const urlResponse = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}upload-url?file_name=${
            obs.file.name
          }&file_type=${
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
              document_name: obs.document_name,
              file_path: key,
              upload_status: "uploaded",
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
      <ResearcherNavbar />
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

                          <Button
                            component="label"
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            sx={{
                              justifyContent: "flex-start",
                              textAlign: "left",
                              borderStyle: "dashed",
                              py: 1.5,
                            }}
                          >
                            {doc.file ? doc.file.name : "Choose File"}
                            <input
                              type="file"
                              hidden
                              onChange={(e) => {
                                updateContextDoc(
                                  index,
                                  "file",
                                  e.target.files?.[0] || null
                                );

                                updateContextDoc(
                                  index,
                                  "document_name",
                                  e.target.files?.[0]?.name || ""
                                );
                              }}
                            />
                          </Button>

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

                          <Button
                            component="label"
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            sx={{
                              justifyContent: "flex-start",
                              textAlign: "left",
                              borderStyle: "dashed",
                              py: 1.5,
                            }}
                          >
                            {obs.file ? obs.file.name : "Choose File"}
                            <input
                              type="file"
                              hidden
                              onChange={(e) => {
                                updateObservation(
                                  index,
                                  "file",
                                  e.target.files?.[0] || null
                                );

                                updateObservation(
                                  index,
                                  "document_name",
                                  e.target.files?.[0]?.name || ""
                                );
                              }}
                            />
                          </Button>
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

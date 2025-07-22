import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import { ArrowBack, Add } from "@mui/icons-material";

const individualResponsesData = [
  { id: 1, response: "Response 1", status: "Uploaded", llmScore: 8 },
  { id: 2, response: "Response 2", status: "Uploaded", llmScore: 9 },
  { id: 3, response: "Response 3", status: "Uploaded", llmScore: 10 },
  { id: 4, response: "Response 4", status: "Processing", llmScore: 3 },
];

export default function ResponseGroups({ groupId, onBack }) {
  const [responses, setResponses] = useState(individualResponsesData);

  const getStatusColor = (status) => {
    return status === "Uploaded" ? "success" : "warning";
  };

  const handleAddResponse = () => {
    const newResponse = {
      id: responses.length + 1,
      response: `Response ${responses.length + 1}`,
      status: "Uploaded",
      llmScore: Math.floor(Math.random() * 10) + 1,
    };
    setResponses((prev) => [...prev, newResponse]);
  };

  const handleRemoveResponse = (responseId) => {
    setResponses((prev) => prev.filter((r) => r.id !== responseId));
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={onBack}
          sx={{
            mr: 2,
            backgroundColor: "#8B5CF6",
            color: "white",
            "&:hover": {
              backgroundColor: "#7C3AED",
            },
          }}
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 600, color: "#1F2937" }}>
          Spatial Empathy
        </Typography>
      </Box>

      <Typography variant="h5" sx={{ mb: 3, color: "#374151" }}>
        Response Group {groupId}
      </Typography>

      <Typography variant="h6" sx={{ mb: 2, color: "#6B7280" }}>
        Responses Table
      </Typography>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", mb: 3 }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Responses
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                LLM Score
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {responses.map((response) => (
              <TableRow
                key={response.id}
                sx={{
                  "&:hover": { backgroundColor: "#F9FAFB" },
                  backgroundColor: "transparent",
                }}
              >
                <TableCell
                  sx={{
                    color: "#1F2937",
                    fontWeight: 400,
                  }}
                >
                  {response.response}
                </TableCell>
                <TableCell>
                  <Chip
                    label={response.status}
                    color={getStatusColor(response.status)}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </TableCell>
                <TableCell sx={{ color: "#6B7280" }}>
                  {response.llmScore}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleRemoveResponse(response.id)}
                    sx={{ textTransform: "none" }}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={handleAddResponse}
        sx={{
          backgroundColor: "#8B5CF6",
          borderRadius: 3,
          textTransform: "none",
          px: 3,
          "&:hover": {
            backgroundColor: "#7C3AED",
          },
        }}
      >
        Add Response
      </Button>
    </Box>
  );
}

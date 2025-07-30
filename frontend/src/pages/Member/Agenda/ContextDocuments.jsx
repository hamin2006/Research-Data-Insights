"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // or however you get agenda_id
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Box,
  Typography,
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
import { Upload, Delete } from "@mui/icons-material";
import AddContextDocumentModal from "./AddContextDocumentModal";

export default function ContextDocuments() {
  const { agendaId } = useParams(); // Get agenda ID from URL
  const [documents, setDocuments] = useState([]);
  const [agendaName, setAgendaName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchContextDocuments = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        const agendaData = await response.json();
        setDocuments(agendaData.context_documents || []);
        setAgendaName(agendaData.agenda_name || "");
      } catch (error) {
        console.error("Error fetching context documents:", error);
      } finally {
        setLoading(false);
      }
    };

    if (agendaId) {
      fetchContextDocuments();
    }
  }, [agendaId]);

  const getStatusColor = (status) => {
    return status === "uploaded" ? "success" : "warning";
  };

  const handleDeleteDocument = (docId) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleAddDocument = (newDoc) => {
    const docWithId = {
      id: documents.length + 1,
      ...newDoc,
    };
    setDocuments((prev) => [...prev, docWithId]);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: 600, color: "#1F2937", mb: 3 }}
      >
        {agendaName}
      </Typography>

      {/* Upload Area */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 2,
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          border: "2px dashed rgba(139, 92, 246, 0.3)",
          textAlign: "center",
          cursor: "pointer",
          "&:hover": {
            backgroundColor: "rgba(139, 92, 246, 0.15)",
          },
        }}
        onClick={() => setIsAddModalOpen(true)}
      >
        <Upload sx={{ fontSize: 48, color: "#8B5CF6", mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1, color: "#8B5CF6" }}>
          Add Context Documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click to upload or drag and drop files
        </Typography>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2, color: "#6B7280" }}>
        Context Documents Table
      </Typography>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                File Name
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Description
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow
                key={doc.id}
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
                  {doc.document_name}
                </TableCell>
                <TableCell sx={{ color: "#6B7280" }}>
                  {doc.description}
                </TableCell>
                <TableCell>
                  <Chip
                    label={doc.upload_status}
                    color={getStatusColor(doc.upload_status)}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteDocument(doc.id)}
                    sx={{
                      "&:hover": { backgroundColor: "rgba(244, 67, 54, 0.1)" },
                    }}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AddContextDocumentModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDocument={handleAddDocument}
      />
    </Box>
  );
}

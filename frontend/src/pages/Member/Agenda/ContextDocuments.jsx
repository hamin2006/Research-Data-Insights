"use client";

import { useState } from "react";
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

const contextDocumentsData = [
  {
    id: 1,
    fileName: "Document 1",
    description: "Spatial Empathy Description",
    status: "Uploaded",
  },
  {
    id: 2,
    fileName: "Document 2",
    description: "Survey Questions",
    status: "Uploaded",
  },
  {
    id: 3,
    fileName: "Document 3",
    description: "Survey Audio",
    status: "Uploaded",
  },
  {
    id: 4,
    fileName: "Document 4",
    description: "More Context",
    status: "Processing",
  },
];

export default function ContextDocuments() {
  const [documents, setDocuments] = useState(contextDocumentsData);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const getStatusColor = (status) => {
    return status === "Uploaded" ? "success" : "warning";
  };

  const handleDeleteDocument = (docId) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleAddDocument = (newDoc) => {
    const docWithId = {
      id: documents.length + 1,
      ...newDoc,
      status: "Uploaded",
    };
    setDocuments((prev) => [...prev, docWithId]);
  };

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: 600, color: "#1F2937", mb: 3 }}
      >
        Spatial Empathy
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
                  {doc.fileName}
                </TableCell>
                <TableCell sx={{ color: "#6B7280" }}>
                  {doc.description}
                </TableCell>
                <TableCell>
                  <Chip
                    label={doc.status}
                    color={getStatusColor(doc.status)}
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

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
import ResponseGroupDetail from "./ResponseGroups";
import AddResponseModal from "./AddResponseModal";

const responseGroupsData = [
  { id: 1, fileName: "Response Group 1", status: "Uploaded", format: "CSV" },
  { id: 2, fileName: "Response Group 2", status: "Uploaded", format: "PDF" },
  { id: 3, fileName: "Response Group 3", status: "Uploaded", format: "CSV2" },
  { id: 4, fileName: "Response Group 4", status: "Processing", format: "DOCX" },
];

export default function Responses() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [responseGroups, setResponseGroups] = useState(responseGroupsData);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const getStatusColor = (status) => {
    return status === "Uploaded" ? "success" : "warning";
  };

  const handleGroupClick = (groupId) => {
    setSelectedGroup(groupId);
  };

  const handleBackClick = () => {
    setSelectedGroup(null);
  };

  const handleAddResponseGroup = (newGroup) => {
    const groupWithId = {
      id: responseGroups.length + 1,
      ...newGroup,
      status: "Uploaded",
    };
    setResponseGroups((prev) => [...prev, groupWithId]);
  };

  const handleDeleteGroup = (groupId, event) => {
    event.stopPropagation();
    setResponseGroups((prev) => prev.filter((group) => group.id !== groupId));
  };

  if (selectedGroup) {
    return (
      <ResponseGroupDetail groupId={selectedGroup} onBack={handleBackClick} />
    );
  }

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
          Add Responses
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click to upload or drag and drop files
        </Typography>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2, color: "#6B7280" }}>
        Response Group Table
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
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Format
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {responseGroups.map((group) => (
              <TableRow
                key={group.id}
                sx={{
                  "&:hover": { backgroundColor: "#F9FAFB" },
                  cursor: "pointer",
                  backgroundColor:
                    group.id === 2 ? "rgba(139, 92, 246, 0.1)" : "transparent",
                }}
                onClick={() => handleGroupClick(group.id)}
              >
                <TableCell
                  sx={{
                    color: group.id === 2 ? "#8B5CF6" : "#1F2937",
                    fontWeight: group.id === 2 ? 600 : 400,
                  }}
                >
                  {group.fileName}
                </TableCell>
                <TableCell>
                  <Chip
                    label={group.status}
                    color={getStatusColor(group.status)}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </TableCell>
                <TableCell sx={{ color: "#6B7280" }}>{group.format}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => handleDeleteGroup(group.id, e)}
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

      <AddResponseModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddGroup={handleAddResponseGroup}
      />
    </Box>
  );
}

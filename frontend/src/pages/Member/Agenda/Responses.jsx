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
import ResponseGroupDetail from "./ResponseGroups";
import AddResponseModal from "./AddResponseModal";

export default function Responses() {
  const { agendaId } = useParams(); // Get agenda ID from URL
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [responseGroups, setResponseGroups] = useState([]);
  const [agendaName, setAgendaName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchResponseGroups = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}`, {
          headers: {
            Authorization: token,
          }
        });

        const agendaData = await response.json();
        setResponseGroups(agendaData.research_observations || []);
        setAgendaName(agendaData.agenda_name || "");
      } catch (error) {
        console.error("Error fetching response groups:", error);
      } finally {
        setLoading(false);
      }
    };

    if (agendaId) {
      fetchResponseGroups();
    }
  }, [agendaId]);

  const getStatusColor = (status) => {
    return status === "Uploaded" ? "success" : "warning";
  };

  const handleGroupClick = (groupId) => {
    setSelectedGroup(groupId);
  };

  const handleBackClick = () => {
    setSelectedGroup(null);
  };

  const handleAddResponseGroup = async (newGroup) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;

    if (newGroup.file) {
      // Get presigned URL
      const urlResponse = await fetch(`${import.meta.env.VITE_API_ENDPOINT}upload-url?file_name=${newGroup.file.name}&file_type=${newGroup.file.type}&agenda_id=${agendaId}&document_type=observation`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      const { presignedurl, key } = await urlResponse.json();

      // Upload to S3
      await fetch(presignedurl, {
        method: "PUT",
        body: newGroup.file,
        headers: { "Content-Type": newGroup.file.type }
      });

      // Save to database
      await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/research-observation`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_name: newGroup.document_name,
          file_path: key
        })
      });

      // Add to local state
      const groupWithId = {
        id: responseGroups.length + 1,
        document_name: newGroup.document_name,
        file_path: key,
        status: "Uploaded",
      };
      setResponseGroups((prev) => [...prev, groupWithId]);
    }
  } catch (error) {
    console.error("Error adding response group:", error);
  }
};


  const handleDeleteGroup = (groupId, event) => {
    event.stopPropagation();
    setResponseGroups((prev) => prev.filter((group) => group.id !== groupId));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

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
                  backgroundColor: "transparent",
                }}
                onClick={() => handleGroupClick(group.id)}
              >
                <TableCell
                  sx={{
                    color: "#1F2937",
                    fontWeight: 400,
                  }}
                >
                  {group.document_name}
                </TableCell>
                <TableCell>
                  <Chip
                    label="Uploaded"
                    color="success"
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </TableCell>
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

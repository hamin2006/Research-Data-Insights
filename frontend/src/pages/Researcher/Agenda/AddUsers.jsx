import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import { Box, 
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  InputAdornment,
  TableContainer,
  Chip,
} from "@mui/material";
import { Search, Add } from "@mui/icons-material";
import AddUserModal from "./AddUserModal";

export default function AddUsers() {
  const { agendaId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [agendaName, setAgendaName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborators();
    fetchAgendaName();
  }, [agendaId]);

  const fetchCollaborators = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/collaborators`, {
        headers: {
          Authorization: token,
        }
      });

      if (response.ok) {
        const collaborators = await response.json();
        
        const formattedUsers = collaborators.map(collab => ({
          id: collab.id_agenda_collaborator,
          fullName: `${collab.first_name} ${collab.last_name}`,
          status: "Authorized",
          email: collab.user_email,
        }));

        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgendaName = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}`, {
        headers: {
          Authorization: token,
        }
      });

      if (response.ok) {
        const agenda = await response.json();
        setAgendaName(agenda.agenda_name);
      }
    } catch (error) {
      console.error("Error fetching agenda:", error);
    }
  };

  const handleAddUser = async (newUser) => {
    // Refresh the collaborators list after adding
    await fetchCollaborators();
  };

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    return status === "Authorized" ? "success" : "warning";
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: "#1F2937" }}>
          {agendaName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            backgroundColor: "#8B5CF6",
            borderRadius: 3,
            textTransform: "none",
            px: 3,
            "&:hover": {
              backgroundColor: "#7C3AED",
            },
          }}
          onClick={() => setIsModalOpen(true)}
        >
          Add Collaborator
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by Name"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
        }}
      />

      <Typography variant="h6" sx={{ mb: 2, color: "#6B7280" }}>
        Collaborator Table
      </Typography>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Full Name
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Email
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow
                key={user.id}
                sx={{ "&:hover": { backgroundColor: "#F9FAFB" } }}
              >
                <TableCell sx={{ color: "#1F2937" }}>{user.fullName}</TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    color={getStatusColor(user.status)}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </TableCell>
                <TableCell sx={{ color: "#6B7280" }}>{user.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <AddUserModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddUser={handleAddUser}
        agendaId={agendaId}
      />
    </Box>
  );
}

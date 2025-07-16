import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  InputAdornment,
} from "@mui/material";
import { Search, Add } from "@mui/icons-material";
import AddUserModal from "./AddUserModal";

const userData = [
  {
    id: 1,
    fullName: "John Doe",
    status: "Authorized",
    email: "john.doe@ubc.ca",
  },
  {
    id: 2,
    fullName: "Patrick Star",
    status: "Waiting For Sign-up",
    email: "patrick.star@ubc.ca",
  },
  {
    id: 3,
    fullName: "Casper Ghost",
    status: "Authorized",
    email: "casper.ghost@gmail.com",
  },
];

export default function AddUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState(userData);

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    return status === "Authorized" ? "success" : "warning";
  };

  const handleAddUser = (newUser) => {
    const userWithId = {
      id: users.length + 1,
      ...newUser,
    };
    setUsers((prev) => [...prev, userWithId]);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600, color: "#1F2937" }}>
          Spatial Empathy
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
          Add User
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
        User Table
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
      />
    </Box>
  );
}

"use client";
import { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  IconButton,
} from "@mui/material";
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import CssBaseline from "@mui/material/CssBaseline";
import AdminNavbar from "./AdminNavbar";
import { fetchAuthSession } from "aws-amplify/auth";

export default function AdminHomePage() {
  const [researchers, setResearchers] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [newInstructorEmail, setNewInstructorEmail] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const loadResearchers = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}users`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const users = await response.json();
          const researchers = users
            .filter((user) => user.roles && user.roles.includes("researcher"))
            .map((user) => ({
              id: user.cognito_id,
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.user_email,
              status: "Active",
              cognitoId: user.cognito_id,
            }));
          setResearchers(researchers);
        }
      } catch (error) {
        console.error("Error loading researchers:", error);
      }
    };

    loadResearchers();
  }, []);

  const handleRowClick = (instructor) => {
    setSelectedInstructor(instructor);
    setRemoveModalOpen(true);
  };

  const handleAddResearcher = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      // Check if researcher already exists locally
      const existingResearcher = researchers.find(
        (researcher) => researcher.email === newInstructorEmail
      );
      if (existingResearcher) {
        setSnackbar({
          open: true,
          message: `Researcher with email ${newInstructorEmail} already exists.`,
          severity: "error",
        });
        return;
      }

      // First, get all users to find the one with this email
      const usersResponse = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}users`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!usersResponse.ok) {
        throw new Error(`Error fetching users: ${usersResponse.status}`);
      }

      const users = await usersResponse.json();
      const userToPromote = users.find(
        (user) => user.user_email === newInstructorEmail.trim()
      );

      if (!userToPromote) {
        setSnackbar({
          open: true,
          message: "User not found. They must sign up first.",
          severity: "error",
        });
        return;
      }

      // Add researcher role using PATCH endpoint
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}user/${userToPromote.cognito_id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "add",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error Status: ${response.status}`);
      }

      const updatedUser = await response.json();

      // Add to local state
      const newInstructor = {
        id: userToPromote.cognito_id,
        firstName: userToPromote.first_name,
        lastName: userToPromote.last_name,
        email: userToPromote.user_email,
        status: "Active",
        cognitoId: userToPromote.cognito_id,
      };

      setResearchers([...researchers, newInstructor]);
      setSnackbar({
        open: true,
        message: `Instructor with email ${newInstructorEmail} elevated successfully!`,
        severity: "success",
      });

      setNewInstructorEmail("");
      setAddModalOpen(false);
    } catch (error) {
      console.error("Error elevating instructor", error);
      setSnackbar({
        open: true,
        message: "Failed to add instructor",
        severity: "error",
      });
    }
  };

  const handleRemoveInstructor = async () => {
    if (selectedInstructor?.cognitoId) {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}user/${
            selectedInstructor.cognitoId
          }`,
          {
            method: "PATCH",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "remove",
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Error Status: ${response.status}`);
        }

        setResearchers(
          researchers.filter(
            (researcher) => researcher.id !== selectedInstructor.id
          )
        );
        setSnackbar({
          open: true,
          message: "Researcher removed successfully!",
          severity: "success",
        });
        setRemoveModalOpen(false);
        setSelectedInstructor(null);
      } catch (error) {
        console.error("Error removing researcher", error);
        setSnackbar({
          open: true,
          message: "Failed to remove researcher",
          severity: "error",
        });
      }
    }
  };

  const handleDailyMessageLimitChange = (value) => {
    setDailyMessageLimit(value);
    setSnackbar({
      open: true,
      message: "Daily message limit updated!",
      severity: "success",
    });
  };

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          minWidth: "100vw",
          background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
        }}
      >
        <AdminNavbar />

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Researcher Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddModalOpen(true)}
              sx={{
                borderRadius: 2,
                backgroundColor: "#8B5CF6",
                "&:hover": { backgroundColor: "#7C3AED" },
              }}
            >
              Add Researcher
            </Button>
          </Box>

          <TableContainer
            component={Paper}
            sx={{ borderRadius: 2, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 600 }}>First Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Last Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {researchers.map((researcher) => (
                  <TableRow
                    key={researcher.id}
                    onClick={() => handleRowClick(researcher)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <TableCell>{researcher.firstName}</TableCell>
                    <TableCell>{researcher.lastName}</TableCell>
                    <TableCell>
                      <Chip
                        label={researcher.status}
                        size="small"
                        sx={{
                          backgroundColor:
                            researcher.status === "Active"
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            researcher.status === "Active"
                              ? "#166534"
                              : "#92400e",
                          border:
                            researcher.status === "Active"
                              ? "1px solid #bbf7d0"
                              : "1px solid #fde68a",
                        }}
                      />
                    </TableCell>
                    <TableCell>{researcher.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add Instructor Modal */}
          <Dialog
            open={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                Add New Researcher
                <IconButton onClick={() => setAddModalOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Research Team Member Email"
                type="email"
                fullWidth
                variant="outlined"
                value={newInstructorEmail}
                onChange={(e) => setNewInstructorEmail(e.target.value)}
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setAddModalOpen(false)} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleAddResearcher}
                variant="contained"
                disabled={!newInstructorEmail.trim()}
                sx={{
                  backgroundColor: "#8B5CF6",
                  "&:hover": { backgroundColor: "#7C3AED" },
                }}
              >
                Add Instructor
              </Button>
            </DialogActions>
          </Dialog>

          {/* Remove Instructor Modal */}
          <Dialog
            open={removeModalOpen}
            onClose={() => setRemoveModalOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                Remove Instructor
                <IconButton onClick={() => setRemoveModalOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to remove{" "}
                <strong>
                  {selectedInstructor?.firstName} {selectedInstructor?.lastName}
                </strong>{" "}
                as an instructor?
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setRemoveModalOpen(false)} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleRemoveInstructor}
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
              >
                Remove Instructor
              </Button>
            </DialogActions>
          </Dialog>
        </Container>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}

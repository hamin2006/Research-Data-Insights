"use client";
import { useState } from "react";
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

const initialInstructors = [
  {
    id: 1,
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@university.edu",
    status: "Active",
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@university.edu",
    status: "Active",
  },
  {
    id: 3,
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@university.edu",
    status: "Awaiting Sign-up",
  },
  {
    id: 4,
    firstName: "Emily",
    lastName: "Davis",
    email: "emily.davis@university.edu",
    status: "Active",
  },
  {
    id: 5,
    firstName: "David",
    lastName: "Wilson",
    email: "david.wilson@university.edu",
    status: "Active",
  },
];

export default function AdminHomePage() {
  const [instructors, setInstructors] = useState(initialInstructors);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [newInstructorEmail, setNewInstructorEmail] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleRowClick = (instructor) => {
    setSelectedInstructor(instructor);
    setRemoveModalOpen(true);
  };

  const handleAddInstructor = () => {
    if (newInstructorEmail.trim()) {
      const newInstructor = {
        id: Math.max(...instructors.map((i) => i.id)) + 1,
        firstName: "New",
        lastName: "Instructor",
        email: newInstructorEmail.trim(),
        status: "Active",
      };
      setInstructors([...instructors, newInstructor]);
      setSnackbar({
        open: true,
        message: "Instructor added successfully!",
        severity: "success",
      });
      setNewInstructorEmail("");
      setAddModalOpen(false);
    }
  };

  const handleRemoveInstructor = (id) => {
    if (selectedInstructor.id) {
      setInstructors(
        instructors.filter(
          (instructor) => instructor.id !== selectedInstructor.id
        )
      );
      setSnackbar({
        open: true,
        message: "Instructor removed successfully!",
        severity: "success",
      });
      setRemoveModalOpen(false);
      setSelectedInstructor(null);
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
              sx={{ borderRadius: 2 }}
            >
              Add Instructor
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
                {instructors.map((instructor) => (
                  <TableRow
                    key={instructor.id}
                    onClick={() => handleRowClick(instructor)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <TableCell>{instructor.firstName}</TableCell>
                    <TableCell>{instructor.lastName}</TableCell>
                    <TableCell>
                      <Chip
                        label={instructor.status}
                        size="small"
                        sx={{
                          backgroundColor:
                            instructor.status === "Active"
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            instructor.status === "Active"
                              ? "#166534"
                              : "#92400e",
                          border:
                            instructor.status === "Active"
                              ? "1px solid #bbf7d0"
                              : "1px solid #fde68a",
                        }}
                      />
                    </TableCell>
                    <TableCell>{instructor.email}</TableCell>
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
                Add New Instructor
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
                onClick={handleAddInstructor}
                variant="contained"
                disabled={!newInstructorEmail.trim()}
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

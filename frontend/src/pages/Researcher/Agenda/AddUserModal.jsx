import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from "@mui/material";
import { Email, Person } from "@mui/icons-material";
import { fetchAuthSession } from "aws-amplify/auth";

export default function AddUserModal({ open, onClose, onAddUser, agendaId }) {
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUser = async () => {
    if (!email.trim()) return;

    setIsAdding(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/collaborators`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: email.trim()
        })
      });

      if (response.ok) {
        onAddUser({
          fullName: email.trim(), // Will be updated when parent refreshes
          email: email.trim(),
          status: "Authorized",
        });
        handleClose();
      } else {
        const error = await response.text();
        alert(`Error adding collaborator: ${error}`);
      }
    } catch (error) {
      console.error("Error adding collaborator:", error);
      alert("Error adding collaborator");
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setIsAdding(false);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddUser();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Person color="primary" />
          <Typography variant="h6">Add New Collaborator</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the email address of the user you want to add as a collaborator.
        </Typography>

        <TextField
          fullWidth
          label="Email Address"
          placeholder="Enter email address..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          type="email"
          InputProps={{
            startAdornment: <Email color="action" sx={{ mr: 1 }} />,
          }}
          sx={{ mb: 2 }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleAddUser}
          variant="contained"
          disabled={!email.trim() || isAdding}
          sx={{
            backgroundColor: "#8B5CF6",
            "&:hover": {
              backgroundColor: "#7C3AED",
            },
            "&:disabled": {
              backgroundColor: "#D1D5DB",
            },
          }}
        >
          {isAdding ? "Adding..." : "Add Collaborator"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

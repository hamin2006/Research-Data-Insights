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
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { Search, Email, Person } from "@mui/icons-material";

const mockStudents = [
  {
    id: 1,
    fullName: "Alice Johnson",
    email: "alice.johnson@ubc.ca",
    department: "Computer Science",
  },
  {
    id: 2,
    fullName: "Bob Smith",
    email: "bob.smith@ubc.ca",
    department: "Psychology",
  },
  {
    id: 3,
    fullName: "Carol Davis",
    email: "carol.davis@ubc.ca",
    department: "Engineering",
  },
  {
    id: 4,
    fullName: "David Wilson",
    email: "david.wilson@ubc.ca",
    department: "Mathematics",
  },
  {
    id: 5,
    fullName: "Emma Brown",
    email: "emma.brown@ubc.ca",
    department: "Biology",
  },
  {
    id: 6,
    fullName: "Frank Miller",
    email: "frank.miller@ubc.ca",
    department: "Physics",
  },
];

export default function AddUserModal({ open, onClose, onAddUser }) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState(mockStudents);
  const [selectedUser, setSelectedUser] = useState(mockStudents[0]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;

    setIsSearching(true);

    setTimeout(() => {
      const results = mockStudents.filter(
        (student) =>
          student.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
          student.fullName.toLowerCase().includes(searchEmail.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleAddUser = () => {
    if (selectedUser) {
      onAddUser({
        fullName: selectedUser.fullName,
        email: selectedUser.email,
        status: "Waiting For Sign-up",
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchEmail("");
    setSearchResults([]);
    setSelectedUser(null);
    setIsSearching(false);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Person color="primary" />
          <Typography variant="h6">Add New User</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search for students by email address or name to add them to the
            system.
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Enter email address or name..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={!searchEmail.trim() || isSearching}
              sx={{
                backgroundColor: "#8B5CF6",
                minWidth: 100,
                "&:hover": {
                  backgroundColor: "#7C3AED",
                },
              }}
            >
              {isSearching ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Search />
              )}
            </Button>
          </Box>
        </Box>

        {searchResults.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Search Results
            </Typography>
            <List
              sx={{
                maxHeight: 300,
                overflow: "auto",
                border: "1px solid #E5E7EB",
                borderRadius: 1,
              }}
            >
              {searchResults.map((student) => (
                <ListItem key={student.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleSelectUser(student)}
                    selected={selectedUser?.id === student.id}
                    sx={{
                      "&.Mui-selected": {
                        backgroundColor: "rgba(139, 92, 246, 0.1)",
                        "&:hover": {
                          backgroundColor: "rgba(139, 92, 246, 0.2)",
                        },
                      },
                    }}
                  >
                    <ListItemText
                      primary={student.fullName}
                      secondary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {student.email}
                          </Typography>
                          <Chip
                            label={student.department}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {searchEmail && searchResults.length === 0 && !isSearching && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Typography color="text.secondary">
              No students found matching "{searchEmail}"
            </Typography>
          </Box>
        )}

        {selectedUser && (
          <Box
            sx={{
              p: 2,
              backgroundColor: "#F9FAFB",
              borderRadius: 1,
              border: "1px solid #E5E7EB",
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, color: "#8B5CF6" }}>
              Selected User
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {selectedUser.fullName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedUser.email}
            </Typography>
            <Chip
              label={selectedUser.department}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleAddUser}
          variant="contained"
          disabled={!selectedUser}
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
          Add User
        </Button>
      </DialogActions>
    </Dialog>
  );
}

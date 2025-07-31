import { useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Slider,
  Button,
  TextField,
} from "@mui/material";
import AdminNavbar from "./AdminNavbar";
import WarningModal from "../../components/WarningModal";

function AISettings({ messageLimit }) {
  const [tempLimit, setTempLimit] = useState(messageLimit);
  const [dailyMessageLimit, setDailyMessageLimit] = useState(100);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSave = () => {
    setDailyMessageLimit(tempLimit);
    setModalOpen(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      }}
    >
      <AdminNavbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 4 }}>
          AI Settings
        </Typography>

        <Paper
          sx={{
            p: 4,
            borderRadius: 2,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography variant="h6" sx={{ mb: 3 }}>
            Daily Message Limits
          </Typography>

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set the maximum number of messages users can send per day
            </Typography>

            <Box sx={{ px: 2 }}>
              <Slider
                value={tempLimit}
                onChange={(_, value) => setTempLimit(value)}
                min={1}
                max={250}
                step={1}
                marks={[
                  { value: 1, label: "1" },
                  { value: 250, label: "250" },
                  { value: 500, label: "500" },
                  { value: 750, label: "750" },
                  { value: 1000, label: "1000" },
                ]}
                valueLabelDisplay="on"
                sx={{
                  color: "#8B5CF6",
                  "& .MuiSlider-valueLabelOpen": {
                    backgroundColor: "#8B5CF6",
                  },
                }}
              />
            </Box>

            <Typography
              variant="body1"
              sx={{
                mt: 2,
                textAlign: "center",
              }}
            >
              Current limit:{" "}
              <strong>
                <TextField
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  type="number"
                  inputProps={{ min: 1, max: 250 }}
                  sx={{ p: 0, width: 80, height: 50, textAlign: "center" }}
                />{" "}
                messages per day
              </strong>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={() => setTempLimit(dailyMessageLimit)}
              color="inherit"
            >
              Reset
            </Button>
            <Button
              onClick={() => setModalOpen(true)}
              variant="contained"
              sx={{
                backgroundColor: "#8B5CF6",
                "&:hover": { backgroundColor: "#7C3AED" },
              }}
            >
              Save Changes
            </Button>
          </Box>
        </Paper>
      </Container>
      <WarningModal
        open={modalOpen}
        message={
          "These changes will affect AI messaging limits for the insights generator for all collaborators. Are you sure you want to continue?"
        }
        title={"Confirm Changes"}
        confirmText={"Confirm"}
        onConfirm={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </Box>
  );
}

export default AISettings;

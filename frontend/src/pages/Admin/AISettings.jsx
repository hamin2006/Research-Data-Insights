import { useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Slider,
  Button,
} from "@mui/material";
import AdminNavbar from "./AdminNavbar";

function AISettings({ messageLimit }) {
  const [tempLimit, setTempLimit] = useState(messageLimit);
  const [dailyMessageLimit, setDailyMessageLimit] = useState(100);

  const handleSave = () => {
    setDailyMessageLimit(tempLimit);
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
                max={1000}
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
                  "& .MuiSlider-valueLabelOpen": {
                    backgroundColor: "primary.main",
                  },
                }}
              />
            </Box>

            <Typography variant="body1" sx={{ mt: 2, textAlign: "center" }}>
              Current limit: <strong>{tempLimit} messages per day</strong>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={() => setTempLimit(dailyMessageLimit)}
              color="inherit"
            >
              Reset
            </Button>
            <Button onClick={handleSave} variant="contained">
              Save Changes
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default AISettings;

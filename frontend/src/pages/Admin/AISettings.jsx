import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Slider,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import AdminNavbar from "./AdminNavbar";
import WarningModal from "../../components/WarningModal";
import { fetchAuthSession } from "aws-amplify/auth";

function AISettings() {
  const [tempLimit, setTempLimit] = useState(0);
  const [dailyMessageLimit, setDailyMessageLimit] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [noLimit, setNoLimit] = useState(false); // Add state for checkbox

  useEffect(() => {
    const loadLimit = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}admin/message_limit`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const res = await response.json();
          console.log(res);
          setTempLimit(res.value);
          setDailyMessageLimit(res.value);
          if (res.value === "Infinity") {
            setNoLimit(true);
          }
        }
      } catch (error) {
        console.error("Error loading message limit:", error);
      }
    };

    loadLimit();
  }, []);

  const handleSave = async () => {
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}admin/message_limit`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: noLimit ? "Infinity" : tempLimit.toString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save message limit");
      }
    } catch (error) {
      console.error("Error saving message limit:", error);
    }

    setDailyMessageLimit(noLimit ? Infinity : tempLimit); // Save Infinity if no limit
    setModalOpen(false);
  };

  // Handle checkbox change
  const handleNoLimitChange = (event) => {
    setNoLimit(event.target.checked);
    if (event.target.checked) {
      setTempLimit(Infinity); // Clear limit when checkbox is checked
      setDailyMessageLimit(Infinity); // Set daily limit to Infinity
    } else {
      setTempLimit(dailyMessageLimit); // Restore previous limit when unchecked
    }
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
                value={tempLimit || 0} // Provide default value when null
                onChange={(_, value) => setTempLimit(value)}
                min={1}
                max={250}
                step={1}
                marks={[
                  { value: 1, label: "1" },
                  { value: 50, label: "50" },
                  { value: 100, label: "100" },
                  { value: 150, label: "150" },
                  { value: 200, label: "200" },
                  { value: 250, label: "250" },
                ]}
                valueLabelDisplay={noLimit ? "off" : "on"}
                disabled={noLimit} // Disable when no limit is checked
                sx={{
                  color: "#8B5CF6",
                  "& .MuiSlider-valueLabelOpen": {
                    backgroundColor: "#8B5CF6",
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                mt: 2,
                textAlign: "center",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                component="span"
                variant="body1"
                sx={{
                  textTransform: "capitalize",
                  fontWeight: "bold",
                }}
              >
                Current limit:
              </Typography>

              <TextField
                value={noLimit ? "Infinite" : tempLimit}
                onChange={(e) => setTempLimit(e.target.value)}
                type={noLimit ? "string" : "number"}
                disabled={noLimit}
                inputProps={{ min: 1, max: Infinity }}
                sx={{
                  p: 0,
                  mx: 1,
                  width: noLimit ? 80 : 70,
                  height: 50,
                }}
              />

              <Typography
                component="span"
                variant="body1"
                sx={{
                  textTransform: "capitalize",
                  fontWeight: "bold",
                }}
              >
                messages per day
              </Typography>
            </Box>
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={noLimit}
                onChange={handleNoLimitChange}
                sx={{
                  color: "#8B5CF6",
                  "&.Mui-checked": { color: "#8B5CF6" },
                }}
              />
            }
            label={
              <Typography
                variant="body1"
                sx={{
                  textTransform: "capitalize",
                  fontWeight: "bold",
                }}
              >
                No Message Limit
              </Typography>
            }
            sx={{ mb: 2 }}
          />

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

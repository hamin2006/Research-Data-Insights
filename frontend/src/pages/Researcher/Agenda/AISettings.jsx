import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Box,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import WarningModal from "../../../components/WarningModal";
const availableModels = [
  { id: "meta.llama3-8b-instruct-v1:0", name: "Llama 3 8b", provider: "Meta" },
  {
    id: "meta.llama3-70b-instruct-v1:0",
    name: "Llama 3 70b",
    provider: "Meta",
  },
  {
    id: "amazon.titan-text-express-v1",
    name: "Titan Express V1",
    provider: "Amazon",
  },
  {
    id: "amazon.titan-text-lite-v1",
    name: "Titan Lite V1",
    provider: "Amazon",
  },
  {
    id: "mistral.mistral-large-2402-v1:0",
    name: "Large 2402",
    provider: "Mistral",
  },
];

export default function AISettings() {
  const { agendaId } = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState([]);
  const [scoringMethod, setScoringMethod] = useState("Mean");
  const [hyperparameters, setHyperparameters] = useState({
    temperature: 0,
    topP: 0,
    topK: 1,
  });

  useEffect(() => {
    const fetchHyperparameters = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/ai-settings`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        const data = await response.json();
        setHyperparameters(data.hyperparameter_settings);
        setScoringMethod(data.scoring_method);
        setSelectedModels(data.scoring_models);
      } catch (error) {
        console.error("Error fetching hyperparameters:", error);
      }
    };

    if (agendaId) {
      fetchHyperparameters();
    }
  }, [agendaId]);

  const handleModelChange = (modelId) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleHyperparameterChange = (param, value) => {
    setHyperparameters((prev) => ({ ...prev, [param]: value }));
  };

  const handleConfirm = async () => {
    setModalOpen(false);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const hyperparameter_settings = {
        temperature: hyperparameters.temperature,
        topP: hyperparameters.topP,
        topK: hyperparameters.topK,
      };
      console.log("Saving settings:", hyperparameter_settings);

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/ai-settings`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            hyperparameter_settings,
            selected_models: selectedModels,
            scoring_method: scoringMethod,
          }),
        }
      );

      console.log(selectedModels);

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const hyperparameterConfigs = [
    {
      key: "temperature",
      label: "Temperature",
      min: 0,
      max: 2,
      step: 0.1,
      description: "Controls randomness in responses",
    },
    {
      key: "topP",
      label: "Top-p",
      min: 0,
      max: 1,
      step: 0.1,
      description: "Nucleus sampling parameter",
    },
    {
      key: "topK",
      label: "Top-k",
      min: 1,
      max: 100,
      step: 1,
      description: "Limits vocabulary for each step",
    },
  ];

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: 600, color: "#1F2937", mb: 3 }}
      >
        AI Settings
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#374151" }}>
          Model Selection
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose which AI models to use for scoring responses. Multiple models
          can be selected. If you select multiple ensure you choose a scoring
          method to combine their scores.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <FormGroup>
              {availableModels.map((model) => (
                <FormControlLabel
                  key={model.id}
                  control={
                    <Checkbox
                      checked={selectedModels.includes(model.id)}
                      onChange={() => {
                        handleModelChange(model.id);
                      }}
                      sx={{
                        color: "#8B5CF6",
                        "&.Mui-checked": { color: "#8B5CF6" },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">{model.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {model.provider}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="scoring-method-label">Scoring Method</InputLabel>
              <Select
                labelId="scoring-method-label"
                value={scoringMethod}
                label="Scoring Method"
                onChange={(e) => setScoringMethod(e.target.value)}
                sx={{
                  width: 150,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#D1D5DB",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#8B5CF6",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#8B5CF6",
                  },
                }}
              >
                <MenuItem value="Mean">Mean</MenuItem>
                <MenuItem value="Median">Median</MenuItem>
                <MenuItem value="Majority">Majority</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, color: "#374151" }}>
          Hyperparameters
        </Typography>
        <Grid container spacing={3}>
          {hyperparameterConfigs.map((config) => (
            <Grid item xs={12} md={6} key={config.key}>
              <Box sx={{ px: 2 }}>
                <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                  {config.label}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {config.description}
                </Typography>
                <Slider
                  value={hyperparameters[config.key]}
                  onChange={(_, value) =>
                    handleHyperparameterChange(config.key, value)
                  }
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  valueLabelDisplay="auto"
                  sx={{ color: "#8B5CF6" }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Current value: {hyperparameters[config.key]}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Button
        variant="contained"
        startIcon={<Save />}
        onClick={() => setModalOpen(true)}
        sx={{
          backgroundColor: "#8B5CF6",
          borderRadius: 2,
          textTransform: "none",
          px: 3,
          "&:hover": {
            backgroundColor: "#7C3AED",
          },
        }}
      >
        Save AI Settings
      </Button>

      <WarningModal
        open={modalOpen}
        message={
          "These changes may affect AI behavior for LLM scoring and insights for all collaborators. Are you sure you want to continue?"
        }
        title={"Confirm Changes"}
        confirmText={"Confirm"}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </Box>
  );
}

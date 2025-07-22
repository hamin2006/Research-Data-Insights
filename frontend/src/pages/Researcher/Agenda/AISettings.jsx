import { useState } from "react";
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
} from "@mui/material";
import { Save } from "@mui/icons-material";
import WarningModal from "../../../components/WarningModal";
const availableModels = [
  { id: "meta-llama-3-8b", name: "Llama 3 8b", provider: "Meta" },
  { id: "meta-llama-3-70b", name: "Llama 3 70b", provider: "Meta" },
  {
    id: "amazon-titan-express-v1",
    name: "Titan Express V1",
    provider: "Amazon",
  },
  {
    id: "amazon-titan-lite-v1",
    name: "Titan Lite V1",
    provider: "Amazon",
  },
  { id: "mistral-large-2402", name: "Large 2402", provider: "Mistral" },
];

export default function AISettings() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState([
    "meta-llama-3-8b",
    "amazon-titan-express-v1",
    "mistral-large-2402",
  ]);
  const [hyperparameters, setHyperparameters] = useState({
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxTokens: 2048,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  });

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

  const handleConfirm = () => {
    setModalOpen(false);
    // Save settings logic here
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
    {
      key: "maxTokens",
      label: "Max Tokens",
      min: 1,
      max: 4096,
      step: 1,
      description: "Maximum response length",
    },
    {
      key: "frequencyPenalty",
      label: "Frequency Penalty",
      min: -2,
      max: 2,
      step: 0.1,
      description: "Reduces repetition",
    },
    {
      key: "presencePenalty",
      label: "Presence Penalty",
      min: -2,
      max: 2,
      step: 0.1,
      description: "Encourages new topics",
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
          Choose which AI models to use for generating responses. Multiple
          models can be selected.
        </Typography>
        <FormGroup>
          {availableModels.map((model) => (
            <FormControlLabel
              key={model.id}
              control={
                <Checkbox
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleModelChange(model.id)}
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

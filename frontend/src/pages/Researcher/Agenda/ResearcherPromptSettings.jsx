import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { ExpandMore, Save } from "@mui/icons-material";

export default function PromptSettings() {
  const [textGenPrompt, setTextGenPrompt] = useState("");
  const [scoringPrompt, setScoringPrompt] = useState("");
  const [selfAggPrompt, setSelfAggPrompt] = useState("");
  const [textGenDP, setTextGenDP] = useState(false);
  const [scoringDP, setScoringDP] = useState(false);
  const [selfAggDP, setSelfAggDP] = useState(false);

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: 600, color: "#1F2937", mb: 3 }}
      >
        Prompt Settings
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#374151" }}>
          General LLM-RAG Interaction Prompt
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This controls the instructions given to the AI chat assistant.
          Changing it will change its behaviour.
        </Typography>
        <FormControlLabel
          key={"generalLLMPrompt"}
          control={
            <Checkbox
              checked={textGenDP}
              onChange={() => {
                setTextGenDP(!textGenDP);
              }}
              sx={{
                color: "#8B5CF6",
                "&.Mui-checked": { color: "#8B5CF6" },
              }}
            />
          }
          label={
            <Typography variant="body1">{"Set Default Prompt"}</Typography>
          }
        />

        <TextField
          fullWidth
          multiline
          rows={20}
          value={textGenPrompt}
          onChange={(e) => setTextGenPrompt(e.target.value)}
          placeholder="Enter your system prompt here..."
          sx={{ mb: 2 }}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#374151" }}>
          Scoring Prompt
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This controls the instructions given to the each of the AI scoring
          assistants used as context for aggregated scoring. Changing it will
          change its behaviour.
        </Typography>
        <FormControlLabel
          key={"scoringPrompt"}
          control={
            <Checkbox
              checked={scoringDP}
              onChange={() => {
                setScoringDP(!scoringDP);
              }}
              sx={{
                color: "#8B5CF6",
                "&.Mui-checked": { color: "#8B5CF6" },
              }}
            />
          }
          label={
            <Typography variant="body1">{"Set Default Prompt"}</Typography>
          }
        />
        <TextField
          fullWidth
          multiline
          rows={20}
          value={scoringPrompt}
          onChange={(e) => setScoringPrompt(e.target.value)}
          placeholder="Enter your system prompt here..."
          sx={{ mb: 2 }}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#374151" }}>
          Generative Self-Aggregation Prompt
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This controls the instructions given to the final AI assistant which
          will dictate how aggregated scoring will take place. Changing it will
          change its behaviour.
        </Typography>
        <FormControlLabel
          key={"selfAggPrompt"}
          control={
            <Checkbox
              checked={selfAggDP}
              onChange={() => {
                setSelfAggDP(!selfAggDP);
              }}
              sx={{
                color: "#8B5CF6",
                "&.Mui-checked": { color: "#8B5CF6" },
              }}
            />
          }
          label={
            <Typography variant="body1">{"Set Default Prompt"}</Typography>
          }
        />
        <TextField
          fullWidth
          multiline
          rows={20}
          value={selfAggPrompt}
          onChange={(e) => setSelfAggPrompt(e.target.value)}
          placeholder="Enter your system prompt here..."
          sx={{ mb: 2 }}
        />
      </Paper>

      <Button
        variant="contained"
        startIcon={<Save />}
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
        Save Prompt Settings
      </Button>
    </Box>
  );
}

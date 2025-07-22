import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import { ExpandMore, Save } from "@mui/icons-material";
import WarningModal from "../../../components/WarningModal";

export default function MemberPromptSettings() {
  const [textGenPrompt, setTextGenPrompt] = useState("");
  const [scoringPrompt, setScoringPrompt] = useState("");
  const [selfAggPrompt, setSelfAggPrompt] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleConfirm = () => {
    setModalOpen(false);
  };

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
        Save Prompt Settings
      </Button>

      <WarningModal
        open={modalOpen}
        message={
          "These changes may effect AI behaviour for your LLM scoring and insights. Are you sure you want to continue?"
        }
        title={"Confirm Changes"}
        confirmText={"Confirm"}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </Box>
  );
}

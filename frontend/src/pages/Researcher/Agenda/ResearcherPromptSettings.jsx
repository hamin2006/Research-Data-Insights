import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import { ExpandMore, Save } from "@mui/icons-material";
import WarningModal from "../../../components/WarningModal";

export default function PromptSettings() {
  const { agendaId } = useParams();
  const [prompts, setPrompts] = useState({
    general_rag: { text: "", isDefault: false, id: null },
    scoring: { text: "", isDefault: false, id: null },
    self_aggregation: { text: "", isDefault: false, id: null }
  });
  const [promptHistory, setPromptHistory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, [agendaId]);

  const fetchPrompts = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/prompts`, {
        headers: {
          Authorization: token,
        }
      });

      const promptsData = await response.json();
      
      // Group prompts by type
      const groupedPrompts = {
        general_rag: { text: "", isDefault: false, id: null },
        scoring: { text: "", isDefault: false, id: null },
        self_aggregation: { text: "", isDefault: false, id: null }
      };

      promptsData.forEach(prompt => {
        if (prompt.is_default || !groupedPrompts[prompt.prompt_type].text) {
          groupedPrompts[prompt.prompt_type] = {
            text: prompt.prompt_text,
            isDefault: prompt.is_default,
            id: prompt.id_research_agenda_prompt
          };
        }
      });

      setPrompts(groupedPrompts);
      setPromptHistory(promptsData);
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async (promptType, promptText, isDefault) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/prompts`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt_type: promptType,
          prompt_text: promptText,
          is_default: isDefault
        })
      });

      if (response.ok) {
        fetchPrompts(); // Refresh prompts
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
    }
  };

  const handleConfirm = async () => {
    // Save all prompts
    await Promise.all([
      savePrompt("general_rag", prompts.general_rag.text, prompts.general_rag.isDefault),
      savePrompt("scoring", prompts.scoring.text, prompts.scoring.isDefault),
      savePrompt("self_aggregation", prompts.self_aggregation.text, prompts.self_aggregation.isDefault)
    ]);
    setModalOpen(false);
  };

  const updatePrompt = (type, field, value) => {
    setPrompts(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  if (loading) return <div>Loading...</div>;

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
          control={
            <Checkbox
              checked={prompts.general_rag.isDefault}
              onChange={(e) => updatePrompt("general_rag", "isDefault", e.target.checked)}
              sx={{
                color: "#8B5CF6",
                "&.Mui-checked": { color: "#8B5CF6" },
              }}
            />
          }
          label={<Typography variant="body1">Set Default Prompt</Typography>}
        />
        <TextField
          fullWidth
          multiline
          rows={20}
          value={prompts.general_rag.text}
          onChange={(e) => updatePrompt("general_rag", "text", e.target.value)}
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
          assistants used as context for aggregated scoring.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={prompts.scoring.isDefault}
              onChange={(e) => updatePrompt("scoring", "isDefault", e.target.checked)}
              sx={{
                color: "#8B5CF6",
                "&.Mui-checked": { color: "#8B5CF6" },
              }}
            />
          }
          label={<Typography variant="body1">Set Default Prompt</Typography>}
        />
        <TextField
          fullWidth
          multiline
          rows={20}
          value={prompts.scoring.text}
          onChange={(e) => updatePrompt("scoring", "text", e.target.value)}
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
          will dictate how aggregated scoring will take place.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={prompts.self_aggregation.isDefault}
              onChange={(e) => updatePrompt("self_aggregation", "isDefault", e.target.checked)}
              sx={{
                color: "#8B5CF6",
                "&.Mui-checked": { color: "#8B5CF6" },
              }}
            />
          }
          label={<Typography variant="body1">Set Default Prompt</Typography>}
        />
        <TextField
          fullWidth
          multiline
          rows={20}
          value={prompts.self_aggregation.text}
          onChange={(e) => updatePrompt("self_aggregation", "text", e.target.value)}
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

      <Paper sx={{ p: 3, my: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#374151" }}>
          Prompt History
        </Typography>
        {promptHistory.map((prompt) => (
          <Accordion key={prompt.id_research_agenda_prompt} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>{new Date(prompt.created_at).toLocaleDateString()}</Typography>
                <Chip label={prompt.prompt_type} size="small" />
                {prompt.is_default && <Chip label="Default" color="primary" size="small" />}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                multiline
                rows={10}
                value={prompt.prompt_text}
                InputProps={{ readOnly: true }}
              />
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      <WarningModal
        open={modalOpen}
        message={
          "These changes may effect AI behaviour for LLM scoring and insights for yourself and all other collaborators. Are you sure you want to continue?"
        }
        title={"Confirm Changes"}
        confirmText={"Confirm"}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </Box>
  );
}

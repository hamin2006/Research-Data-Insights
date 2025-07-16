import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  FormControlLabel,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Divider,
  Drawer,
  Avatar,
  Fab,
} from "@mui/material";
import { Send, Settings, Close, SmartToy, Person } from "@mui/icons-material";

export default function ChatTab() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      content:
        "Hello! I'm your AI assistant for spatial empathy analysis. How can I help you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Meta Llama 3 8b");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const contextDocuments = [
    { id: 1, name: "Document 1: Spatial Empathy Description", checked: true },
    { id: 2, name: "Document 2: Survey Questions", checked: true },
    { id: 3, name: "Document 3: Survey Audio", checked: true },
    { id: 4, name: "Document 4: More Context", checked: false },
  ];

  const responseGroups = [
    { id: 1, name: "Response Group 1", checked: true },
    { id: 2, name: "Response Group 2", checked: true },
    { id: 3, name: "Response Group 3", checked: true },
    { id: 4, name: "Response Group 4", checked: false },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      content: message,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: messages.length + 2,
        content: `I understand you're asking about "${message}". Based on the spatial empathy context and the selected response groups, I can help analyze this from multiple perspectives. Would you like me to dive deeper into any specific aspect?`,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 100px)",
        position: "relative",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: "1px solid #E5E7EB",
          backgroundColor: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: "#1F2937" }}>
            Spatial Empathy Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-powered analysis and insights
          </Typography>
        </Box>
        <IconButton
          onClick={() => setIsSettingsOpen(true)}
          sx={{
            backgroundColor: "#F3F4F6",
            "&:hover": { backgroundColor: "#E5E7EB" },
          }}
        >
          <Settings />
        </IconButton>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          backgroundColor: "#FAFAFA",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "flex-start",
              maxWidth: "80%",
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.sender === "ai" && (
              <Avatar
                sx={{ backgroundColor: "#8B5CF6", width: 32, height: 32 }}
              >
                <SmartToy sx={{ fontSize: 18 }} />
              </Avatar>
            )}
            <Paper
              sx={{
                p: 2,
                backgroundColor: msg.sender === "user" ? "#8B5CF6" : "white",
                color: msg.sender === "user" ? "white" : "#1F2937",
                borderRadius: 2,
                maxWidth: "100%",
                wordBreak: "break-word",
              }}
            >
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                {msg.content}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  fontSize: "0.75rem",
                }}
              >
                {formatTime(msg.timestamp)}
              </Typography>
            </Paper>
            {msg.sender === "user" && (
              <Avatar
                sx={{ backgroundColor: "#6B7280", width: 32, height: 32 }}
              >
                <Person sx={{ fontSize: 18 }} />
              </Avatar>
            )}
          </Box>
        ))}

        {isTyping && (
          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
            <Avatar sx={{ backgroundColor: "#8B5CF6", width: 32, height: 32 }}>
              <SmartToy sx={{ fontSize: 18 }} />
            </Avatar>
            <Paper sx={{ p: 2, backgroundColor: "white", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                AI is typing...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 3,
          backgroundColor: "white",
          borderTop: "1px solid #E5E7EB",
          display: "flex",
          gap: 2,
          alignItems: "flex-end",
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: "#F9FAFB",
            },
          }}
        />
        <Fab
          size="medium"
          onClick={handleSendMessage}
          disabled={!message.trim()}
          sx={{
            backgroundColor: "#8B5CF6",
            color: "white",
            "&:hover": {
              backgroundColor: "#7C3AED",
            },
            "&:disabled": {
              backgroundColor: "#D1D5DB",
            },
          }}
        >
          <Send />
        </Fab>
      </Box>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 350,
            p: 0,
          },
        }}
      >
        <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Chat Settings
            </Typography>
            <IconButton onClick={() => setIsSettingsOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>

          <Typography
            variant="subtitle2"
            sx={{ mb: 2, color: "#374151", fontWeight: 600 }}
          >
            AI Model
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This model will be used for text generation
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              size="small"
            >
              <MenuItem value="Meta Llama 3 8b">Meta Llama 3 8b</MenuItem>
              <MenuItem value="GPT-4">Mistral Large 2402</MenuItem>
              <MenuItem value="Claude 3">Amazon Titan Express V1</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="subtitle2"
            sx={{ mb: 2, color: "#374151", fontWeight: 600 }}
          >
            Context Documents
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select documents the AI can reference
          </Typography>

          <Box sx={{ mb: 3 }}>
            {contextDocuments.map((doc) => (
              <FormControlLabel
                key={doc.id}
                control={
                  <Checkbox
                    defaultChecked={doc.checked}
                    size="small"
                    sx={{
                      color: "#8B5CF6",
                      "&.Mui-checked": { color: "#8B5CF6" },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                    {doc.name}
                  </Typography>
                }
                sx={{ display: "block", mb: 1, ml: 0 }}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="subtitle2"
            sx={{ mb: 2, color: "#374151", fontWeight: 600 }}
          >
            Response Groups
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select response groups for analysis
          </Typography>

          <Box sx={{ mb: 3 }}>
            {responseGroups.map((group) => (
              <FormControlLabel
                key={group.id}
                control={
                  <Checkbox
                    defaultChecked={group.checked}
                    size="small"
                    sx={{
                      color: "#8B5CF6",
                      "&.Mui-checked": { color: "#8B5CF6" },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                    {group.name}
                  </Typography>
                }
                sx={{ display: "block", mb: 1, ml: 0 }}
              />
            ))}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

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
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Button,
} from "@mui/material";
import {
  Add,
  Send,
  Settings,
  EditNote,
  Close,
  SmartToy,
  Person,
} from "@mui/icons-material";
import { fetchAuthSession } from 'aws-amplify/auth';
import { useParams } from 'react-router-dom';

export default function ChatTab() {
  const { agendaId } = useParams(); 
  const [chatSessions, setChatSessions] = useState([]);
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
  const [isChatSessionsOpen, setIsChatSessionsOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState(1);
  const [selectedModel, setSelectedModel] = useState("Meta Llama 3 8b");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [contextDocuments, setContextDocuments] = useState([]);
  const [responseGroups, setResponseGroups] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState('context'); 

// Replace your sessionId state and useEffects with:
const [sessionId, setSessionId] = useState(null);

// Single useEffect to handle session initialization
useEffect(() => {
  const initializeSessions = async () => {
    if (!agendaId) return;
    
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      // Fetch existing sessions
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/sessions`, {
        headers: { Authorization: token }
      });

      if (response.ok) {
        const sessions = await response.json();
        setChatSessions(sessions);
        
        // If no sessionId set and sessions exist, use the first one
        if (!sessionId && sessions.length > 0) {
          setSessionId(sessions[0].id_chat_session);
        }
        // If no sessions exist, create a new one
        else if (!sessionId && sessions.length === 0) {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Error initializing sessions:', error);
    }
  };

  initializeSessions();
}, [agendaId]); // Remove sessionId from dependencies

const createNewSession = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;

    const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_name: 'New Chat Session' })
    });

    if (response.ok) {
      const newSession = await response.json();
      setSessionId(newSession.id_chat_session);
      setChatSessions(prev => [newSession, ...prev]);
      setMessages([{
        id: 1,
        content: "Hello! I'm your AI assistant for research analysis. How can I help you today?",
        sender: "ai",
        timestamp: new Date(),
      }]);
      setIsChatSessionsOpen(false);
    }
  } catch (error) {
    console.error('Error creating session:', error);
  }
};

const loadSession = async (sessionId) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;

    const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/sessions/${sessionId}/messages`, {
      headers: { Authorization: token }
    });

    if (response.ok) {
      const sessionMessages = await response.json();
      console.log(sessionMessages);
      setMessages(sessionMessages.length > 0 ? sessionMessages : [{
        id: 1,
        content: "Hello! I'm your AI assistant for research analysis. How can I help you today?",
        sender: "ai",
        timestamp: new Date(),
      }]);
      setSessionId(sessionId);
      setIsChatSessionsOpen(false);
    }
  } catch (error) {
    console.error('Error loading session:', error);
  }
};

  // Fetch actual documents on component mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}`, {
          headers: {
            Authorization: token,
          }
        });

        const agendaData = await response.json();
        
        // Set context documents
        const contextDocs = agendaData.context_documents?.map(doc => ({
          id: doc.id_context_doc,
          name: doc.document_name,
          description: doc.description,
          checked: true // Default to checked
        })) || [];

        // Set response groups (research observations)
        const responseObs = agendaData.research_observations?.map(obs => ({
          id: obs.id_research_observations,
          name: obs.document_name,
          checked: true // Default to checked
        })) || [];

        setContextDocuments(contextDocs);
        setResponseGroups(responseObs);
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };

    if (agendaId) {
      fetchDocuments();
    }
  }, [agendaId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add these state variables after your existing useState declarations:
const [settingsChanged, setSettingsChanged] = useState(false);

// Add save settings function:
const saveSettings = () => {
  // Settings are already saved in state, just close drawer and reset flag
  setSettingsChanged(false);
  setIsSettingsOpen(false);
};

// Update document checkbox handlers:
const handleDocumentChange = (docId, checked, type) => {
  if (type === 'context') {
    setContextDocuments(prev => 
      prev.map(d => d.id === docId ? {...d, checked} : d)
    );
  } else {
    setResponseGroups(prev => 
      prev.map(d => d.id === docId ? {...d, checked} : d)
    );
  }
  setSettingsChanged(true);
};

// Update model selection handler:
const handleModelChange = (newModel) => {
  setSelectedModel(newModel);
  setSettingsChanged(true);
};


  const getModelId = (modelName) => {
  const modelMap = {
    "Meta Llama 3 8b": "meta.llama3-8b-instruct-v1:0",
    "Mistral Large 2402": "mistral.mistral-large-2402-v1:0", 
    "Amazon Titan Express V1": "amazon.titan-text-express-v1"
  };
  return modelMap[modelName] || "meta.llama3-8b-instruct-v1:0";
};

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

  try {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;

    // Get selected document IDs
    const selectedDocs = selectedDocumentType === 'context' 
      ? contextDocuments.filter(d => d.checked).map(d => d.id)
      : responseGroups.filter(d => d.checked).map(d => d.id);

    const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/text_generation?session_id=${sessionId}&document_type=${selectedDocumentType}&agenda_id=${agendaId}&model_id=${getModelId(selectedModel)}`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message_content: message,
        selected_documents: selectedDocs
      })
    });

    const result = await response.json();

    console.log('Backend response:', result);
    
    const aiMessage = {
      id: messages.length + 2,
      content: result.response || result.llm_output || "I couldn't process your request.",
      sender: "ai",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, aiMessage]);

    // Update session name if it was generated
    if (result.session_name) {
      setChatSessions(prev => 
        prev.map(s => 
          s.id_chat_session === sessionId 
            ? { ...s, session_name: result.session_name }
            : s
        )
      );
    }

  } catch (error) {
    console.error('RAG query failed:', error);
    const errorMessage = {
      id: messages.length + 2,
      content: "Sorry, I encountered an error processing your request. Please try again.",
      sender: "ai",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsTyping(false);
  }
};

  
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Add this function after your other helper functions:
const formatMessageContent = (content) => {
  return content
    // Remove excessive asterisks
    .replace(/\*{2,}/g, '')
    // Add line breaks after section headers (text followed by colon)
    .replace(/([A-Z][^:\n]*:)/g, '\n$1\n')
    // Clean up multiple line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Add spacing around numbered lists
    .replace(/(\d+\.\s)/g, '\n$1')
    .trim();
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
        <Box sx={{ display: "flex", gap: 3 }}>
          <IconButton
            onClick={() => setIsChatSessionsOpen(true)}
            sx={{
              backgroundColor: "#F3F4F6",
              "&:hover": { backgroundColor: "#E5E7EB" },
            }}
          >
            <EditNote />
          </IconButton>

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
                backgroundColor: msg.sender === "user" ? "#8B5CF6" : "transparent",
                color: msg.sender === "user" ? "white" : "#1F2937",
                border: "none",
                maxWidth: "100%",
                wordBreak: "break-word",
              }}
            >
<Typography variant="body1" sx={{ mb: 0.5, whiteSpace: 'pre-line' }}>
  {msg.sender === 'ai' ? formatMessageContent(msg.content) : msg.content}
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
        sx={{ "& .MuiDrawer-paper": { width: 350, p: 0 } }}
      >
        <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Chat Settings</Typography>
            <IconButton onClick={() => setIsSettingsOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle2" sx={{ mb: 2, color: "#374151", fontWeight: 600 }}>
            AI Model
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              size="small"
            >
              <MenuItem value="Meta Llama 3 8b">Meta Llama 3 8b</MenuItem>
              <MenuItem value="Mistral Large 2402">Mistral Large 2402</MenuItem>
              <MenuItem value="Amazon Titan Express V1">Amazon Titan Express V1</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 2, color: "#374151", fontWeight: 600 }}>
            Document Source
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Select
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
              size="small"
            >
              <MenuItem value="context">Context Documents</MenuItem>
              <MenuItem value="observation">Research Observations</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mb: 3 }}>
            {(selectedDocumentType === 'context' ? contextDocuments : responseGroups).map((doc) => (
              <FormControlLabel
                key={doc.id}
                control={
                  <Checkbox
                    checked={doc.checked}
                    onChange={(e) => handleDocumentChange(doc.id, e.target.checked, selectedDocumentType)}
                    size="small"
                    sx={{ color: "#8B5CF6", "&.Mui-checked": { color: "#8B5CF6" } }}
                  />
                }
                label={<Typography variant="body2">{doc.name}</Typography>}
                sx={{ display: "block", mb: 1, ml: 0 }}
              />
            ))}
          </Box>

          {/* Save Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={saveSettings}
            disabled={!settingsChanged}
            sx={{
              backgroundColor: "#8B5CF6",
              "&:hover": { backgroundColor: "#7C3AED" },
              "&:disabled": { backgroundColor: "#D1D5DB" },
              mt: 2
            }}
          >
            Save Settings
          </Button>
        </Box>
      </Drawer>



      {/* Chat Sessions Drawer */}
      <Drawer
        anchor="right"
        open={isChatSessionsOpen}
        onClose={() => setIsChatSessionsOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: 350, p: 0 } }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2 }}>
            <Typography variant="h6">Chat Sessions</Typography>
            <IconButton onClick={() => setIsChatSessionsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <Divider />
          
          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={createNewSession}
              startIcon={<Add />}
              sx={{ mb: 2 }}
            >
              New Session
            </Button>
          </Box>
          
          <List sx={{ flex: 1, overflow: "auto" }}>
            {chatSessions.map((session) => (
              <ListItem key={session.id_chat_session} disablePadding>
                <ListItemButton
                  onClick={() => loadSession(session.id_chat_session)}
                  selected={sessionId === session.id_chat_session}
                >
                  <ListItemText
                    primary={session.session_name}
                    secondary={formatTime(new Date(session.created_at))}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

    </Box>
  );
}

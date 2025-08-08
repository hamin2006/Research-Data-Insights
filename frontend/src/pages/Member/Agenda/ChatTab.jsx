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
  const [sessionId, setSessionId] = useState(null); // Change from fixed string
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
  const [selectedDocumentType, setSelectedDocumentType] = useState('context'); // 'context' or 'observation'
  
  useEffect(() => {
  const fetchSessions = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/sessions`, {
        headers: { Authorization: token }
      });

      if (response.ok) {
        const sessions = await response.json();
        setChatSessions(sessions);
        if (sessions.length > 0 && !sessionId) {
          setSessionId(sessions[0].id_chat_session);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  if (agendaId) {
    fetchSessions();
  }
}, [agendaId]);

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

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}/text_generation?session_id=${sessionId}&document_type=${selectedDocumentType}&agenda_id=${agendaId}`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message_content: message
        })
      });

      const result = await response.json();
      
      const aiMessage = {
        id: messages.length + 2,
        content: result.response || result.llm_output || "I couldn't process your request.",
        sender: "ai",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
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
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Chat Settings
            </Typography>
            <IconButton onClick={() => setIsSettingsOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ my: 1 }} />

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

      {/* Chat Sessions Drawer */}
      <Drawer
        anchor="right"
        open={isChatSessionsOpen}
        onClose={() => setIsChatSessionsOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 350,
            p: 0,
          },
        }}
      >
        <Box
          sx={{
            p: 0,
            height: "100%",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 3,
              pt: 2,
            }}
          >
            <Typography variant="h6">Chat Sessions</Typography>
            <IconButton onClick={() => setIsChatSessionsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ mt: 1 }} />
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              onClick={createNewSession}
              startIcon={<Add />}
              sx={{
                backgroundColor: "transparent",
                width: "80%",
                mt: 2,
                border: "1px solid black",
                "&:hover": {
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                },
                boxShadow: "none",
                color: "black",
              }}
            >
              Create New Session
            </Button>
          </Box>
          <List>
            {chatSessions.map((session) => (
  <ListItem key={session.id_chat_session}> {/* Change key */}
    <ListItemButton
      onClick={() => loadSession(session.id_chat_session)} // Change onClick
      sx={{
        backgroundColor:
          sessionId === session.id_chat_session ? "rgba(139, 92, 246, 0.1)" : "transparent", // Change condition
      }}
    >
      <ListItemText
        primary={session.session_name} 
        secondary={formatTime(new Date(session.created_at))} 
      />
    </ListItemButton>
  </ListItem>
))}
          </List>
          ;
        </Box>
      </Drawer>
    </Box>
  );
}

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Sidebar from "./Agenda/Sidebar";
import PromptSettings from "./Agenda/PromptSettings";
import Responses from "./Agenda/Responses";
import ContextDocuments from "./Agenda/ContextDocuments";
import ChatTab from "./Agenda/ChatTab";
import MemberNavbar from "../../components/MemberNavbar";

const theme = createTheme({
  palette: {
    primary: {
      main: "#8B5CF6", // Purple color from the image
    },
    background: {
      default: "#F8FAFC",
    },
  },
});

export default function MemberAgendaView({ tab }) {
  const { agendaId } = useParams();
  const navigate = useNavigate();

  const renderContent = () => {
    switch (tab) {
      case "Responses":
        return <Responses />;
      case "Context Documents":
        return <ContextDocuments />;
      case "Prompt Settings":
        return <PromptSettings />;
      case "Chat":
        return <ChatTab />;
      default:
        return <ResponsesTab />;
    }
  };

  const goToActiveTab = (newTab) => {
    switch (newTab) {
      case "Responses":
        navigate(`/agenda/${agendaId}/responses`);
        break;
      case "Context Documents":
        navigate(`/agenda/${agendaId}/context-documents`);
        break;
      case "Prompt Settings":
        navigate(`/agenda/${agendaId}/member-prompt-settings`);
        break;
      case "Chat":
        navigate(`/agenda/${agendaId}/chat`);
        break;
      default:
        navigate(`/agenda/${agendaId}/responses`);
        break;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          minWidth: "99vw",
        }}
      >
        <MemberNavbar />
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar activeTab={tab} onTabChange={goToActiveTab} />
          <Box
            component="main"
            sx={{ flexGrow: 1, p: 3, backgroundColor: "#F3F4F6" }}
          >
            {renderContent()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

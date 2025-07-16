import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Sidebar from "./Agenda/ResearcherSidebar";
import AddUsers from "./Agenda/AddUsers";
import PromptSettings from "./Agenda/ResearcherPromptSettings";
import AISettings from "./Agenda/AISettings";
import ResearcherNavbar from "../../components/ResearcherNavbar";

export default function ResearcherAgendaView({ tab }) {
  const { agendaId } = useParams();
  const navigate = useNavigate();

  const renderContent = () => {
    switch (tab) {
      case "Users":
        return <AddUsers />;
      case "Prompt Settings":
        return <PromptSettings />;
      case "AI Settings":
        return <AISettings />;
      default:
        return <AddUsers />;
    }
  };

  const goToActiveTab = (newTab) => {
    switch (newTab) {
      case "Users":
        navigate(`/agenda/${agendaId}/users`);
        break;
      case "Prompt Settings":
        navigate(`/agenda/${agendaId}/researcher-prompt-settings`);
        break;
      case "AI Settings":
        navigate(`/agenda/${agendaId}/ai-settings`);
        break;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        minWidth: "100vw",
      }}
    >
      <ResearcherNavbar />
      <Box sx={{ display: "flex", flexGrow: 1 }}>
        <Sidebar activeTab={tab} onTabChange={goToActiveTab} />
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 3, backgroundColor: "#F3F4F6" }}
        >
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}

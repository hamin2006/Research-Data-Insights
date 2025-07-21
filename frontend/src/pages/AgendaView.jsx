import { useNavigate, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import MemberSidebar from "./Member/Agenda/MemberSidebar";
import ResearcherSidebar from "./Researcher/Agenda/ResearcherSidebar";
import MemberPromptSettings from "./Member/Agenda/MemberPromptSettings";
import ResearcherPromptSettings from "./Researcher/Agenda/ResearcherPromptSettings";
import AddUsers from "./Researcher/Agenda/AddUsers";
import AISettings from "./Researcher/Agenda/AISettings";
import Responses from "./Member/Agenda/Responses";
import ContextDocuments from "./Member/Agenda/ContextDocuments";
import ChatTab from "./Member/Agenda/ChatTab";
import MemberNavbar from "../components/MemberNavbar";
import ResearcherNavbar from "../components/ResearcherNavbar";

export default function MemberAgendaView({ tab, role }) {
  const { agendaId } = useParams();
  const navigate = useNavigate();

  const renderContent = () => {
    switch (tab) {
      case "Responses":
        return <Responses />;
      case "Context Documents":
        return <ContextDocuments />;
      case "Prompt Settings":
        return role === "member" ? (
          <MemberPromptSettings />
        ) : (
          <ResearcherPromptSettings />
        );
      case "Chat":
        return <ChatTab />;
      case "Users":
        return <AddUsers />;
      case "AI Settings":
        return <AISettings />;
      default:
        return <Responses />;
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
        navigate(`/agenda/${agendaId}/prompt-settings`);
        break;
      case "Chat":
        navigate(`/agenda/${agendaId}/chat`);
        break;
      case "Users":
        navigate(`/agenda/${agendaId}/users`);
        break;
      case "AI Settings":
        navigate(`/agenda/${agendaId}/ai-settings`);
        break;
      default:
        navigate(`/agenda/${agendaId}/responses`);
        break;
    }
  };

  const Sidebar = role === "member" ? MemberSidebar : ResearcherSidebar;

  const Navbar = role === "member" ? MemberNavbar : ResearcherNavbar;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        minWidth: "99vw",
      }}
    >
      <Navbar />
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
  );
}

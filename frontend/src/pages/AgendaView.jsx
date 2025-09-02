import { useNavigate, useParams, useLocation } from "react-router-dom";
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

export default function MemberAgendaView({ tab, role }) {
  const { agendaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const agendaName = location.state?.agendaName || "Agenda";

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
      case "Insights Generator":
        return <ChatTab />;
      case "Collaborators":
        return <AddUsers />;
      case "AI Settings":
        return <AISettings />;
      default:
        return <Responses />;
    }
  };

  const goToActiveTab = (newTab) => {
    const state = { agendaName };
    switch (newTab) {
      case "Responses":
        navigate(`/agenda/${agendaId}/responses`, { state });
        break;
      case "Context Documents":
        navigate(`/agenda/${agendaId}/context-documents`, { state });
        break;
      case "Prompt Settings":
        navigate(`/agenda/${agendaId}/prompt-settings`, { state });
        break;
      case "Insights Generator":
        navigate(`/agenda/${agendaId}/chat`, { state });
        break;
      case "Collaborators":
        navigate(`/agenda/${agendaId}/collaborators`, { state });
        break;
      case "AI Settings":
        navigate(`/agenda/${agendaId}/ai-settings`, { state });
        break;
      default:
        navigate(`/agenda/${agendaId}/responses`, { state });
        break;
    }
  };

  const Sidebar = role === "member" ? MemberSidebar : ResearcherSidebar;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        minWidth: "99vw",
      }}
    >
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          activeTab={tab}
          onTabChange={goToActiveTab}
          agendaName={agendaName}
        />
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

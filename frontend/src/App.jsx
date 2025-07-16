import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState, createContext } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Login from "./pages/Login";
import MemberHomePage from "./pages/Member/MemberHomePage";
import AdminHomePage from "./pages/Admin/AdminHomePage";
import ResearcherHomePage from "./pages/Researcher/ResearcherHomePage";
import ResearcherAgendaView from "./pages/Researcher/ResearcherAgendaView";
import MemberAgendaView from "./pages/Member/MemberAgendaView";
import AllAgendas from "./pages/Researcher/AllAgendas";
import AgendaView from "./pages/AgendaView";

function App() {
  const [user, setUser] = useState(null);
  const [userGroup, setUserGroup] = useState(null);
  const [group, setGroup] = useState(null);

  const theme = createTheme({
    palette: {
      primary: {
        main: "#1976d2",
      },
      secondary: {
        main: "#dc004e",
      },
      background: {
        default: "#f8fafc",
        paper: "#ffffff",
      },
    },
    typography: {
      h6: {
        fontWeight: 600,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
          },
        },
      },
    },
  });

  const getHomePage = () => {
    if (
      userGroup &&
      (userGroup.includes("admin") || userGroup.includes("techadmin"))
    ) {
      return <AdminHomePage />;
    } else if (userGroup && userGroup.includes("User")) {
      return <MemberHomePage />;
    } else {
      return <Login />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" /> : <Login />}
          />
          <Route path="/home" element={getHomePage()} />
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/member" element={<MemberHomePage />} />
          <Route path="/researcher" element={<ResearcherHomePage />} />
          <Route path="/all-agendas" element={<AllAgendas />} />
          <Route
            path="agenda/:agendaId/users"
            element={<AgendaView tab={"Users"} role={"researcher"} />}
          />
          <Route
            path="researcher/agenda/:agendaId/prompt-settings"
            element={<AgendaView tab={"Prompt Settings"} role={"researcher"} />}
          />
          <Route
            path="member/agenda/:agendaId/prompt-settings"
            element={<AgendaView tab={"Prompt Settings"} role={"member"} />}
          />
          <Route
            path="/agenda/:agendaId/ai-settings"
            element={<AgendaView tab={"AI Settings"} role={"researcher"} />}
          />
          <Route
            path="researcher/agenda/:agendaId/responses"
            element={<AgendaView tab={"Responses"} role={"researcher"} />}
          />
          <Route
            path="member/agenda/:agendaId/responses"
            element={<AgendaView tab={"Responses"} role={"member"} />}
          />
          <Route
            path="researcher/agenda/:agendaId/context-documents"
            element={
              <AgendaView tab={"Context Documents"} role={"researcher"} />
            }
          />
          <Route
            path="member/agenda/:agendaId/context-documents"
            element={<AgendaView tab={"Context Documents"} role={"member"} />}
          />
          <Route
            path="researcher/agenda/:agendaId/chat"
            element={<AgendaView tab={"Chat"} role={"researcher"} />}
          />
          <Route
            path="member/agenda/:agendaId/chat"
            element={<AgendaView tab={"Chat"} role={"member"} />}
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

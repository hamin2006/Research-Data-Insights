import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
// Amplify imports
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";

import { useEffect, useState, createContext } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Login from "./pages/Login";
import MemberHomePage from "./pages/Member/MemberHomePage";
import AdminHomePage from "./pages/Admin/AdminHomePage";
import ResearcherHomePage from "./pages/Researcher/ResearcherHomePage";
import AllAgendas from "./pages/Researcher/AllAgendas";
import AgendaView from "./pages/AgendaView";
import AISettings from "./pages/Admin/AISettings";
import AgendaForm from "./pages/Researcher/ResearcherAddAgendaView";

Amplify.configure({
  API: {
    REST: {
      MyApi: {
        endpoint: import.meta.env.VITE_API_ENDPOINT,
      },
    },
  },
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_AWS_REGION,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      allowGuestAccess: false,
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [userGroup, setUserGroup] = useState(null);
  const [group, setGroup] = useState(null);

  const ProtectedRoute = ({ allowedGroups, userGroup, element }) => {
    if (!userGroup) return null;

    const isAuthorized = userGroup.some((group) =>
      allowedGroups.includes(group)
    );

    return isAuthorized ? element : <Navigate to="/home" />;
  };

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

  useEffect(() => {
    const fetchAuthData = () => {
      fetchAuthSession()
        .then(({ tokens }) => {
          if (tokens && tokens.accessToken) {
            const group = tokens.accessToken.payload["cognito:groups"];
            setUser(tokens.accessToken.payload);
            console.log(group);
            setUserGroup(group || []);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    };

    fetchAuthData();
  }, []);

  const getHomePage = () => {
    if (
      userGroup &&
      (userGroup.includes("admin") || userGroup.includes("techadmin"))
    ) {
      return <AdminHomePage />;
    } else if (userGroup && userGroup.includes("researcher")) {
      return <ResearcherHomePage />;
    } else if (userGroup && userGroup.includes("member")) {
      return <MemberHomePage />;
    } else {
      return <Login />;
    }
  };

  const getUserRole = () => {
    if (userGroup && userGroup.includes("admin")) {
      return "admin";
    } else if (userGroup && userGroup.includes("researcher")) {
      return "researcher";
    } else if (userGroup && userGroup.includes("member")) {
      return "member";
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
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedGroups={["admin"]}
                userGroup={userGroup}
                element={<AdminHomePage />}
              />
            }
          />
          <Route path="/member" element={<MemberHomePage />} />
          <Route
            path="/researcher"
            element={
              <ProtectedRoute
                allowedGroups={["researcher"]}
                userGroup={userGroup}
                element={<ResearcherHomePage />}
              />
            }
          />
          <Route
            path="/all-agendas"
            element={<AllAgendas role={getUserRole()} />}
          />
          <Route
            path="/ai-settings"
            element={
              <ProtectedRoute
                allowedGroups={["admin"]}
                userGroup={userGroup}
                element={<AISettings />}
              />
            }
          />
          <Route
            path="/add-agenda"
            element={
              <ProtectedRoute
                allowedGroups={["researcher"]}
                userGroup={userGroup}
                element={<AgendaForm messageLimit={100} />}
              />
            }
          />
          <Route
            path="agenda/:agendaId/collaborators"
            element={
              <ProtectedRoute
                allowedGroups={["researcher"]}
                userGroup={userGroup}
                element={
                  <AgendaView tab={"Collaborators"} role={getUserRole()} />
                }
              />
            }
          />
          <Route
            path="agenda/:agendaId/prompt-settings"
            element={
              <AgendaView tab={"Prompt Settings"} role={getUserRole()} />
            }
          />
          <Route
            path="agenda/:agendaId/ai-settings"
            element={
              <ProtectedRoute
                allowedGroups={["researcher"]}
                userGroup={userGroup}
                element={
                  <AgendaView tab={"AI Settings"} role={getUserRole()} />
                }
              />
            }
          />
          <Route
            path="agenda/:agendaId/responses"
            element={<AgendaView tab={"Responses"} role={getUserRole()} />}
          />
          <Route
            path="agenda/:agendaId/context-documents"
            element={
              <AgendaView tab={"Context Documents"} role={getUserRole()} />
            }
          />
          <Route
            path="agenda/:agendaId/chat"
            element={
              <AgendaView tab={"Insights Generator"} role={getUserRole()} />
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

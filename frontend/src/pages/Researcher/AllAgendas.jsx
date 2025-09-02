import { useState, useMemo, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Container,
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  Home as HomeIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AgendaCard from "../../components/AgendaCard";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";

export default function Component({ role }) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgendas = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}agendas`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAgendas(data);
        }
      } catch (error) {
        console.error("Error fetching agendas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgendas();
  }, []);

  const filteredAgendas = useMemo(() => {
    if (!searchQuery.trim()) {
      return agendas;
    }
    return agendas.filter((agenda) =>
      agenda.agenda_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, agendas]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleDeleteAgenda = async (agendaId) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}agenda/${agendaId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setAgendas(
          agendas.filter((agenda) => agenda.id_research_agenda !== agendaId)
        );
      } else {
        alert("Failed to delete agenda");
      }
    } catch (error) {
      console.error("Error deleting agenda:", error);
      alert("Error deleting agenda");
    }
  };

  const handleResearchViewAgenda = (id) => {
    if (role === "researcher") {
      navigate(`/agenda/${id}/collaborators`);
    } else if (role === "member") {
      navigate(`/agenda/${id}/responses`);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      }}
    >
      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Page Title */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{ fontWeight: 600, color: "text.primary", mb: 3 }}
          >
            View All Agendas
          </Typography>

          {/* Search Bar */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
            <TextField
              placeholder="Search By Name"
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{
                width: "100%",
                maxWidth: 600,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "white",
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: "rgba(0,0,0,0.12)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(0,0,0,0.23)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "primary.main",
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        {/* Results Count */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredAgendas.length} agenda
            {filteredAgendas.length !== 1 ? "s" : ""} found
            {searchQuery && ` for "${searchQuery}"`}
          </Typography>
        </Box>

        {/* Agenda Grid */}
        <Grid container spacing={3}>
          {loading ? (
            <div>Loading...</div>
          ) : (
            filteredAgendas.map((agenda, index) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                <AgendaCard
                  agenda={{
                    id: agenda.id_research_agenda,
                    title: agenda.agenda_name,
                    status: "Active",
                    responses: 0,
                    contextDocuments: 0,
                    dateAdded: new Date(
                      agenda.created_at || Date.now()
                    ).toLocaleString(),
                  }}
                  index={index}
                  role={role}
                  onClick={handleResearchViewAgenda}
                  onDelete={handleDeleteAgenda}
                />
              </Grid>
            ))
          )}
        </Grid>

        {/* No Results Message */}
        {filteredAgendas.length === 0 && searchQuery && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No agendas found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search terms or browse all agendas
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setSearchQuery("")}
              sx={{ mt: 2 }}
            >
              Clear Search
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}

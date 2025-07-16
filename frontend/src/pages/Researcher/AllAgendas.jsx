import { useState, useMemo } from "react";
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
import ResearcherNavbar from "../../components/ResearcherNavbar";

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

const allAgendas = [
  {
    title: "Spatial Empathy",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "June 18, 2025 at 3:44 PM",
  },
  {
    title: "Signal Drift",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "June 18, 2025 at 3:44 PM",
  },
  {
    title: "Interface Ecology",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "June 18, 2025 at 3:44 PM",
  },
  {
    title: "Sleep Spindles",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "June 18, 2025 at 3:44 PM",
  },
  {
    title: "Cognitive Pathways",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "June 18, 2025 at 3:44 PM",
  },
  {
    title: "Emotion Circuits",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "June 18, 2025 at 3:44 PM",
  },
  {
    title: "Neural Networks",
    status: "Active",
    responses: 8,
    contextDocuments: 12,
    dateAdded: "June 17, 2025 at 2:30 PM",
  },
  {
    title: "Behavioral Patterns",
    status: "Inactive",
    responses: 2,
    contextDocuments: 3,
    dateAdded: "June 16, 2025 at 1:15 PM",
  },
  {
    title: "Memory Formation",
    status: "Active",
    responses: 6,
    contextDocuments: 9,
    dateAdded: "June 15, 2025 at 4:20 PM",
  },
];

export default function Component() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgendas = useMemo(() => {
    if (!searchQuery.trim()) {
      return allAgendas;
    }
    return allAgendas.filter((agenda) =>
      agenda.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleResearchViewAgenda = (id) => {
    navigate(`/agenda/${id}/users`);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      }}
    >
      <ResearcherNavbar />
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
          {filteredAgendas.map((agenda, index) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
              <AgendaCard
                agenda={agenda}
                index={index}
                role={"researcher"}
                onClick={handleResearchViewAgenda}
              />
            </Grid>
          ))}
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

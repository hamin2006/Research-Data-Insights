import { Typography, Grid, Box, Container } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import ResearcherNavbar from "../../components/ResearcherNavbar";
import AgendaCard from "../../components/AgendaCard";

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

const agendas = [
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
];

const ResearcherHomePage = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          minWidth: "100vw",
          background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
        }}
      >
        <ResearcherNavbar />

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Home - Recent Agendas
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {agendas.map((agenda, index) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                <AgendaCard agenda={agenda} index={index} role="researcher" />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ResearcherHomePage;

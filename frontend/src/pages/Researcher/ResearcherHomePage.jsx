import { Typography, Grid, Box, Container } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import ResearcherNavbar from "../../components/ResearcherNavbar";
import AgendaCard from "../../components/AgendaCard";
import { useNavigate } from "react-router-dom";

const agendas = [
  {
    id: "spatial-empathy",
    title: "Spatial Empathy",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "May 12, 2025 at 10:22 AM",
  },
  {
    id: "signal-drift",
    title: "Signal Drift",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "July 2, 2025 at 8:15 PM",
  },
  {
    id: "interface-ecology",
    title: "Interface Ecology",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "April 27, 2025 at 1:03 PM",
  },
  {
    id: "sleep-spindles",
    title: "Sleep Spindles",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "June 30, 2025 at 5:44 PM",
  },
  {
    id: "cognitive-pathways",
    title: "Cognitive Pathways",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "March 19, 2025 at 9:27 AM",
  },
  {
    id: "emotion-circuits",
    title: "Emotion Circuits",
    status: "Active",
    responses: 4,
    contextDocuments: 6,
    dateAdded: "July 13, 2025 at 11:56 AM",
  },
];

const ResearcherHomePage = () => {
  const navigate = useNavigate();

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
              <AgendaCard
                agenda={agenda}
                index={index}
                role="researcher"
                onClick={() => handleResearchViewAgenda(agenda.id)}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default ResearcherHomePage;

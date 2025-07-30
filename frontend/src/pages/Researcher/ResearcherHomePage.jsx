import { Typography, Grid, Box, Container } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import ResearcherNavbar from "../../components/ResearcherNavbar";
import AgendaCard from "../../components/AgendaCard";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

const ResearcherHomePage = () => {
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

  const handleResearchViewAgenda = (id) => {
    navigate(`/agenda/${id}/collaborators`);
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
          {loading ? (
            <div>Loading...</div>
          ) : (
            agendas.map((agenda, index) => (
              <Grid
                size={{ xs: 12, md: 6, lg: 4 }}
                key={agenda.id_research_agenda}
              >
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
                  role="researcher"
                  onClick={() =>
                    handleResearchViewAgenda(agenda.id_research_agenda)
                  }
                />
              </Grid>
            ))
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default ResearcherHomePage;

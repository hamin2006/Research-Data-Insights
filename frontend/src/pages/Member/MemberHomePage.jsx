import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import { Typography, Grid, Box, Container } from "@mui/material";
import AgendaCard from "../../components/AgendaCard";

const MemberHomePage = () => {
  const navigate = useNavigate();
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgendasWithDetails = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        // First get all agendas (including ones where user is collaborator)
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}agendas`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        const agendasData = await response.json();

        // Then fetch details for each agenda
        const agendasWithDetails = await Promise.all(
          agendasData.map(async (agenda) => {
            const detailResponse = await fetch(
              `${import.meta.env.VITE_API_ENDPOINT}agenda/${
                agenda.id_research_agenda
              }`,
              {
                headers: {
                  Authorization: token,
                },
              }
            );
            const details = await detailResponse.json();

            return {
              id: agenda.id_research_agenda,
              title: agenda.agenda_name,
              status: "Active",
              responses: details.research_observations?.length || 0,
              contextDocuments: details.context_documents?.length || 0,
              dateAdded: new Date(
                agenda.created_at || Date.now()
              ).toLocaleString(),
            };
          })
        );

        setAgendas(agendasWithDetails);
      } catch (error) {
        console.error("Error fetching agendas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgendasWithDetails();
  }, []);

  const handleMemberViewAgenda = (id) => {
    navigate(`/agenda/${id}/responses`);
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      }}
    >
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
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={agenda.id}>
              <AgendaCard
                agenda={agenda}
                index={index}
                role="member"
                onClick={() => handleMemberViewAgenda(agenda.id)}
                onDelete={() => handleDeleteAgenda(agenda.id)}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default MemberHomePage;

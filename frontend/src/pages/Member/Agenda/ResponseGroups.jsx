import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ArrowBack, Add, Visibility } from "@mui/icons-material";

export default function ResponseGroups({ group, onBack }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { agendaId } = useParams();

  useEffect(() => {
    const fetchResponses = async () => {
      setLoading(true);
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;

        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }agenda/${agendaId}/research-observation/${
            group.id_research_observations
          }/individual-responses`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        const responses = await response.json();
        console.log(responses);
        setResponses(responses);
      } catch (error) {
        console.error("Error fetching response groups:", error);
      } finally {
        setLoading(false);
      }
    };

    if (agendaId && group) {
      fetchResponses();
    }
  }, [agendaId, group]);

  const handleViewResponse = (response) => {
    setSelectedResponse(response);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedResponse(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={onBack}
          sx={{
            mr: 2,
            backgroundColor: "#8B5CF6",
            color: "white",
            "&:hover": {
              backgroundColor: "#7C3AED",
            },
          }}
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 600, color: "#1F2937" }}>
          Spatial Empathy
        </Typography>
      </Box>

      <Typography variant="h5" sx={{ mb: 3, color: "#374151" }}>
        Response Group: {group.document_name}
      </Typography>

      <Typography variant="h6" sx={{ mb: 2, color: "#6B7280" }}>
        Responses Table
      </Typography>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", mb: 3 }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Response
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Text
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                LLM Score
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                Parsed At
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {responses.map((response, index) => (
              <TableRow
                key={response.id_individual_response}
                sx={{
                  "&:hover": { backgroundColor: "#F9FAFB" },
                  backgroundColor: "transparent",
                }}
              >
                <TableCell
                  sx={{
                    color: "#1F2937",
                    fontWeight: 400,
                  }}
                >
                  Response {index + 1}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleViewResponse(response)}
                    sx={{
                      textTransform: "none",
                      color: "#8B5CF6",
                      "&:hover": {
                        backgroundColor: "#F3F4F6",
                      },
                    }}
                  >
                    View Text
                  </Button>
                </TableCell>
                <TableCell sx={{ color: "#6B7280" }}>
                  {response.score}
                </TableCell>
                <TableCell sx={{ color: "#6B7280" }}>
                  {formatDate(response.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Response Text Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: "80vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            color: "#1F2937",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          Response{" "}
          {responses.findIndex(
            (r) =>
              r.id_individual_response ===
              selectedResponse?.id_individual_response
          ) + 1}{" "}
          - Full Text
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography
            variant="body1"
            sx={{
              color: "#374151",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {selectedResponse?.response_text}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: "1px solid #E5E7EB" }}>
          <Button
            onClick={handleCloseDialog}
            variant="contained"
            sx={{
              backgroundColor: "#8B5CF6",
              borderRadius: 2,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#7C3AED",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

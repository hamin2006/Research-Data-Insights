import { useState } from "react";
import {
  Typography,
  Card,
  CardContent,
  CardHeader,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";

function AgendaCard({ agenda, index, role, onClick, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async (event) => {
    event.stopPropagation();
    handleMenuClose();

    if (
      window.confirm(
        "Are you sure you want to delete this agenda? This action cannot be undone."
      )
    ) {
      await onDelete(agenda.id);
    }
  };

  return (
    <Card
      sx={{
        cursor: "pointer",
        height: "100%",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
      onClick={() => onClick(agenda.id, agenda.title)}
    >
      <CardHeader
        title={
          <Box>
            <Typography
              variant="h6"
              component="h3"
              sx={{ mt: 0.5, fontWeight: 600 }}
            >
              {agenda.title}
            </Typography>
          </Box>
        }
        action={
          <IconButton
            onClick={handleMenuClick}
            sx={{
              opacity: 0,
              transition: "opacity 0.2s",
              ".MuiCard-root:hover &": {
                opacity: 1,
              },
            }}
          >
            <MoreVertIcon />
          </IconButton>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Status: ${agenda.status}`}
            size="small"
            sx={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              border: "1px solid #bbf7d0",
              "&:hover": {
                backgroundColor: "#bbf7d0",
              },
            }}
          />
        </Box>

        <Box sx={{ space: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Responses:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {agenda.responses}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Context Documents:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {agenda.contextDocuments}
            </Typography>
          </Box>

          <Box sx={{ pt: 1, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            <Typography variant="caption" color="text.secondary">
              Date Added: {agenda.dateAdded}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => onClick(agenda.id, agenda.title)}>
          View Details
        </MenuItem>
        {role === "researcher" ? (
          <>
            <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
              Delete
            </MenuItem>
          </>
        ) : (
          <></>
        )}
      </Menu>
    </Card>
  );
}

export default AgendaCard;

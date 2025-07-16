import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Home as HomeIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const ResearcherNavbar = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography variant="h6" component="h1" sx={{ color: "text.primary" }}>
          Research Insights Generator
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[
            {
              icon: <HomeIcon />,
              label: "Home",
              onClick: () => navigate("/researcher"),
            },
            {
              icon: <AddIcon />,
              label: "New Agenda",
              onClick: () => navigate("/researcher"),
            },
            {
              icon: <FolderIcon />,
              label: "All Agendas",
              onClick: () => navigate("/all-agendas"),
            },
            {
              icon: <NotificationsIcon />,
              label: "Notifications",
              onClick: () => navigate("/researcher"),
            },
            {
              icon: <PersonIcon />,
              label: "Username",
              onClick: handleClick,
            },
          ].map((item, index) => (
            <Button
              key={index}
              onClick={item.onClick}
              aria-controls={
                item.label === "Username" && open ? "basic-menu" : undefined
              }
              aria-haspopup={item.label === "Username"}
              aria-expanded={
                item.label === "Username" && open ? "true" : undefined
              }
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                py: 1,
                px: 1.5,
                color: "text.secondary",
                "&:hover": {
                  color: "text.primary",
                  backgroundColor: "rgba(0,0,0,0.04)",
                },
              }}
            >
              {item.icon}
              <Typography variant="caption">{item.label}</Typography>
            </Button>
          ))}

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={handleClose}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ResearcherNavbar;

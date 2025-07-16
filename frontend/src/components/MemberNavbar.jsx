import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import {
  Home as HomeIcon,
  Folder as FolderIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const MemberNavbar = () => {
  const navigate = useNavigate();

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
              onClick: () => navigate("/member"),
            },
            {
              icon: <FolderIcon />,
              label: "All Agendas",
              onClick: () => navigate("/all-agendas"),
            },
            {
              icon: <NotificationsIcon />,
              label: "Notifications",
              onClick: () => navigate("/member"),
            },
            {
              icon: <PersonIcon />,
              label: "Username",
              onClick: () => navigate("/member"),
            },
          ].map((item, index) => (
            <Button
              key={index}
              onClick={item.onClick}
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
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default MemberNavbar;

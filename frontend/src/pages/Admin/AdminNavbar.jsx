import { useState, useEffect } from "react";
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
  Person as PersonIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  signOut,
  fetchAuthSession,
  fetchUserAttributes,
} from "aws-amplify/auth";

const AdminNavbar = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  /*
  useEffect(() => {
    const fetchName = async () => {
      try {
        const session = await fetchAuthSession();
        const userAttributes = await fetchUserAttributes();
        const token = session.tokens.idToken;
        const email = userAttributes.email;

        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/get_name?user_email=${encodeURIComponent(email)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        setName(data.name);
      } catch (error) {
        console.error("Error fetching name:", error);
      }
    };

    fetchName();
  }, []);
  */

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async (event) => {
    event.preventDefault();

    try {
      await signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out: ", error);
    }
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
          Research Data Insights
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[
            {
              icon: <HomeIcon />,
              label: "Home",
              onClick: () => navigate("/home"),
            },
            {
              icon: <SettingsIcon />,
              label: "AI Settings",
              onClick: () => navigate("/ai-settings"),
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
              <Typography variant="caption">
                {item.label === "Username"
                  ? name
                    ? name
                    : item.label
                  : item.label}
              </Typography>
            </Button>
          ))}

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={handleSignOut}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AdminNavbar;

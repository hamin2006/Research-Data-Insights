import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Drawer,
} from "@mui/material";
const tabs = [
  "Responses",
  "Context Documents",
  "Prompt Settings",
  "Insights Generator",
];

export default function MemberSidebar({ activeTab, onTabChange, agendaName }) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 240,
          boxSizing: "border-box",
          backgroundColor: "#F8FAFC",
          borderRight: "1px solid #E5E7EB",
          top: 65,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
          {agendaName || "Agenda"}
        </Typography>
      </Box>

      <List sx={{ px: 1 }}>
        {tabs.map((tab) => (
          <ListItem key={tab} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => onTabChange(tab)}
              sx={{
                borderRadius: 1,
                backgroundColor:
                  activeTab === tab ? "rgba(139, 92, 246, 0.7)" : "transparent",
                color: activeTab === tab ? "white" : "text.primary",
                "&:hover": {
                  backgroundColor:
                    activeTab === tab ? "rgba(139, 92, 246, 0.8)" : "#F3F4F6",
                },
              }}
            >
              <ListItemText
                primary={tab}
                primaryTypographyProps={{
                  fontWeight: activeTab === tab ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

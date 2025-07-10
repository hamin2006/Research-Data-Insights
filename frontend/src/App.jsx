import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState, createContext } from "react";
import Login from "./pages/Login";
import MemberHomePage from "./pages/Member/MemberHomePage";
import AdminHomePage from "./pages/Admin/AdminHomePage";
import ResearcherHomePage from "./pages/Researcher/ResearcherHomePage";

function App() {
  const [user, setUser] = useState(null);
  const [userGroup, setUserGroup] = useState(null);
  const [group, setGroup] = useState(null);

  const getHomePage = () => {
    if (
      userGroup &&
      (userGroup.includes("admin") || userGroup.includes("techadmin"))
    ) {
      return <AdminHomePage />;
    } else if (userGroup && userGroup.includes("User")) {
      return <MemberHomePage />;
    } else {
      return <Login />;
    }
  };

  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" /> : <Login />}
          />
          <Route path="/home" element={getHomePage()} />
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/member" element={<MemberHomePage />} />
          <Route path="/researcher" element={<ResearcherHomePage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;

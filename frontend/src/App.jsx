import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState, createContext } from "react";
import Login from './pages/Login';
import UserHomePage from './pages/User/UserHomePage';
import AdminHomePage from './pages/Admin/AdminHomePage';

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
      return <UserHomePage />;
    } else {
      return <Login />;
    }
  };

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={user ? <Navigate to = "/home"/> : <Login />} />
          <Route path="/home" element={getHomePage()} />
        </Routes>
      </Router>
    </>
  )
}

export default App

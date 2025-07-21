import React from "react";
import { signOut } from "aws-amplify/auth";

const AdminHomePage = () => {
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
    <div style={{ padding: "2rem" }}>
      <h1>Admin Home Page</h1>
      <p>
        Welcome to the admin dashboard. Select an option from the menu to get
        started.
      </p>
      <button onClick={handleSignOut}>Logout</button>
    </div>
  );
};

export default AdminHomePage;

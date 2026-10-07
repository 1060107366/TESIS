/* eslint-disable react/prop-types */
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../services/auth/authService.js";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

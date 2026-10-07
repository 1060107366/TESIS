import { removeToken } from "./authService.js";
import { useNavigate } from "react-router-dom";

export const useLogout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  return handleLogout;
};

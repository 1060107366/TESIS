import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/common/Layout.jsx";
import Login from "./components/auth/Login.jsx";
import Register from "./components/auth/Register.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import CustomerList from "./components/customers/CustomerList.jsx";
import CustomerDetail from "./components/customers/CustomerDetail.jsx";
import CreateCustomer from "./components/customers/CreateCustomer.jsx";
import Analysis from "./components/analisys/Analisys.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import { isAuthenticated } from "./services/auth/authService.js";

function App() {
  return (
    <Router>
      <Routes>        
        {/* Rutas públicas */}
        <Route
          path="/login"
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

        <Route
          path="/register"
          element={
            isAuthenticated() ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register />
            )
          }
        />

        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Clientes */}
          <Route path="customers">
            <Route index element={<CustomerList />} />
            <Route path="new" element={<CreateCustomer />} />
            <Route path=":id" element={<CustomerDetail />} />
            <Route path="/customers/:id/edit" element={<CreateCustomer />} />
          </Route>

          {/* Análisis */}
          <Route path="analysis" element={<Analysis />} />

          {/* Ruta para manejar rutas no encontradas */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;

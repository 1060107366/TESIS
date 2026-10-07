import { Link, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  LogOut,
  UserCog,
  User,
} from "lucide-react";
import { useLogout } from "../../services/auth/logoutHandler.js";
import { useState, useEffect } from "react";
import { useUserStore } from "../../stores/UserStore.js";
import UpdateProfile from "../auth/UpdateProfle.jsx";

const Layout = () => {
  const location = useLocation();
  const handleLogout = useLogout();
  const [isUpdateProfileOpen, setIsUpdateProfileOpen] = useState(false);
  const { user, fetchUserInfo } = useUserStore();

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clientes", href: "/customers", icon: Users },
    { name: "Análisis", href: "/analysis", icon: BarChart2 },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra lateral de navegación */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg hidden md:block">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 border-b">
            <span className="text-xl font-bold text-gray-800">CRM IA</span>
          </div>

          {/* Información del usuario */}
          <div className="flex items-center p-4 border-b">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {user?.usuario || "Usuario"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || "Cargando..."}
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t space-y-2">
            <button
              onClick={() => setIsUpdateProfileOpen(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 w-full transition-colors duration-150"
            >
              <UserCog className="w-5 h-5 mr-3" />
              Actualizar Perfil
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 w-full"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Barra superior móvil */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b h-16 flex items-center justify-between px-4">
        <div className="flex items-center">
          <span className="text-xl font-bold text-gray-800">CRM IA</span>
          {user && (
            <span className="ml-3 text-sm text-gray-500">{user.usuario}</span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsUpdateProfileOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <UserCog className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navegación móvil inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
        <nav className="flex justify-around">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center py-3 ${
                  isActive(item.href) ? "text-blue-600" : "text-gray-600"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Modal de actualización de perfil */}
      <UpdateProfile
        isOpen={isUpdateProfileOpen}
        onClose={() => setIsUpdateProfileOpen(false)}
        onUpdate={(userData) => {
          useUserStore.getState().updateUserInfo(userData);
        }}
      />

      {/* Contenido principal */}
      <div className="md:ml-64 min-h-screen pt-16 md:pt-0">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

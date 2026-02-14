import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import ScriptUpload from "./pages/ScriptUpload";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import MainLayout from "./layouts/MainLayout";
import PrivateRoute from "./utils/PrivateRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/feed"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Feed />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/:id?"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Messages />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ScriptUpload />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/search"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Search />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;


import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Join from "./pages/Join";
import RoleSelection from "./pages/RoleSelection";
import WriterOnboarding from "./pages/WriterOnboarding";
import IndustryOnboarding from "./pages/IndustryOnboarding";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import ScriptUpload from "./pages/ScriptUpload";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import SmartMatch from "./pages/SmartMatch";
import ScriptDetail from "./pages/ScriptDetail";
import Auditions from "./pages/Auditions";
import Notifications from "./pages/Notifications";
import Mandates from "./pages/Mandates";
import MainLayout from "./layouts/MainLayout";
import PrivateRoute from "./utils/PrivateRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<RoleSelection />} />
          <Route path="/signup" element={<Join />} />
          <Route path="/writer-onboarding" element={<WriterOnboarding />} />
          <Route path="/industry-onboarding" element={<IndustryOnboarding />} />
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
          <Route
            path="/featured"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Feed />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/smart-match"
            element={
              <PrivateRoute>
                <MainLayout>
                  <SmartMatch />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/script/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ScriptDetail />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/auditions"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Auditions />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Notifications />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/mandates"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Mandates />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/writers"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Search />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/programs"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Messages />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/featured"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Feed />
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


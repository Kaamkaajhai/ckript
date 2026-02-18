import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Join from "./pages/Join";
import RoleSelection from "./pages/RoleSelection";
import WriterOnboarding from "./pages/WriterOnboarding";
import IndustryOnboarding from "./pages/IndustryOnboarding";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import ScriptUpload from "./pages/ScriptUpload";
import Search from "./pages/Search";
import ScriptDetail from "./pages/ScriptDetail";
import Mandates from "./pages/Mandates";
import TopList from "./pages/TopList";
import FeaturedProjects from "./pages/FeaturedProjects";
import Messages from "./pages/Messages";
import Writers from "./pages/Writers";
import ReaderHome from "./pages/ReaderHome";
import ScriptReader from "./pages/ScriptReader";
import ReaderProfile from "./pages/ReaderProfile";
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
            path="/top-list"
            element={
              <PrivateRoute>
                <MainLayout>
                  <TopList />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/featured"
            element={
              <PrivateRoute>
                <MainLayout>
                  <FeaturedProjects />
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
                  <Writers />
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
            path="/reader"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ReaderHome />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reader/script/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ScriptReader />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reader/profile/:id?"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ReaderProfile />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reader/search"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ReaderHome />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reader/featured"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ReaderHome />
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


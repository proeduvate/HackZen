import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/SignUp';
import RoleSelection from './pages/RoleSelection';
import ForgotPassword from './pages/ForgotPassword';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCertificates from './pages/student/StudentCertificates';
import StudentHackathons from './pages/student/StudentHackathons';
import StudentHackathonRegistration from './pages/student/StudentHackathonRegistration';
import HackathonRegistrationStepOne from './pages/student/HackathonRegistrationStepOne';
import HackathonRegistrationStepTwo from './pages/student/HackathonRegistrationStepTwo';
import HackathonRegistrationStepThree from './pages/student/HackathonRegistrationStepThree';
import TeamsPage from './pages/TeamsPage';
import StudentAIAssistant from './pages/student/StudentAIAssistant';
import StudentProfile from './pages/student/StudentProfile';
import EditStudentProfile from './pages/student/EditStudentProfile';
import StudentSubmissions from './pages/student/StudentSubmissions';
import DashboardLayout from './components/Layout';
import MyHackathons from './pages/organizer/MyHackathons';
import OrganizerDashboard from './pages/organizer/Dashboard';
import Analytics from './pages/organizer/Analytics';
import TeamsMentors from './pages/organizer/TeamsMentors';
import CreateHackathon from './pages/organizer/CreateHackathon';
import CreateHackathonStepOne from './pages/organizer/CreateHackathonStepOne';
import CreateHackathonStepTwo from './pages/organizer/CreateHackathonStepTwo';
import CreateHackathonStepThree from './pages/organizer/CreateHackathonStepThree';
import Submissions from './pages/organizer/Submissions';
import EvaluationPanel from './pages/organizer/EvaluationPanel';
import ResultsCertificates from './pages/organizer/ResultsCertificates';
import OrganizerProfile from './pages/organizer/OrganizerProfile';
import EditTimeline from './pages/organizer/EditTimeline';
import ManageHackathon from './pages/organizer/ManageHackathon';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MentorshipRequests from './pages/mentor/MentorshipRequests';
import Feedback from './pages/mentor/Feedback';
import MentorProfile from './pages/mentor/MentorProfile';
import AdminDashboard from './pages/admin/Dashboard';
import Unauthorized from './pages/Unauthorized';
import OrganizerApprovals from './pages/admin/OrganizerApprovals';
import AdminAnalytics from './pages/admin/Analytics';
import AdminDisputes from './pages/admin/Disputes';
import AdminCertificates from './pages/admin/Certificates';
import AdminSubmissions from './pages/admin/Submissions';
import HackathonChangeRequest from './pages/admin/HackathonChangeRequest';
import UsersManagement from './pages/admin/UsersManagement';
import AdminSettings from './pages/admin/Settings';
import AdminProfile from './pages/admin/AdminProfile';
import StudentSettings from './pages/student/StudentSettings';
import OrganizerSettings from './pages/organizer/OrganizerSettings';
import MentorSettings from './pages/mentor/MentorSettings';
import AssignedTeams from './pages/mentor/AssignedTeams';
import DiscoverTeams from './pages/mentor/DiscoverTeams';
import CreateTeam from './pages/mentor/CreateTeam';
import EditOrganizerProfile from './pages/organizer/EditOrganizerProfile';
import EditMentorProfile from './pages/mentor/EditMentorProfile';
import EditAdminProfile from './pages/admin/EditAdminProfile';
import EvaluationCriteria from './pages/organizer/EvaluationCriteria';
import InitializeEvent from './pages/organizer/InitializeEvent';
import InviteMentors from './pages/organizer/InviteMentors';
import HackathonApprovals from './pages/admin/HackathonApprovals';


import './App.css';

// Universal Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const userRole = sessionStorage.getItem('userRole');
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

function AppContent() {
  const location = useLocation();

  // Define paths where the Footer should NOT be displayed
  const hideFooterPaths = [
    '/login',
    '/signup',
    '/get-started',
    '/forgot-password',
  ];

  // Check if the current path is in the hide list or starts with /student (dashboard)
  const shouldHideFooter =
    hideFooterPaths.includes(location.pathname) ||
    location.pathname.startsWith('/student') ||
    location.pathname.startsWith('/organizer') ||
    location.pathname.startsWith('/mentor') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/unauthorized');

  return (
    <div className="flex flex-col min-h-screen text-white bg-navy-900">
      <Routes>
        {/* Main Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Role Selection - Step 1: Choose Your Role */}
        <Route path="/get-started" element={<RoleSelection />} />

        {/* Signup - Step 2: Create Account (role pre-filled) */}
        <Route path="/signup" element={<Signup />} />

        {/* Login - For Returning Users */}
        <Route path="/login" element={<Login />} />

        {/* Forgot Password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Unauthorized Access Page */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Student Dashboard Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="certificates" element={<StudentCertificates />} />
          <Route path="submissions" element={<StudentSubmissions />} />
          <Route path="hackathons" element={<StudentHackathons />} />
          <Route path="hackathons/:hackathonId/register" element={<StudentHackathonRegistration />}>
            <Route index element={<Navigate to="step-1" replace />} />
            <Route path="step-1" element={<HackathonRegistrationStepOne />} />
            <Route path="step-2" element={<HackathonRegistrationStepTwo />} />
            <Route path="step-3" element={<HackathonRegistrationStepThree />} />
          </Route>
          <Route path="teams" element={<TeamsPage />} />
          <Route path="ai-assistant" element={<StudentAIAssistant />} />
          <Route path="profile">
            <Route index element={<StudentProfile />} />
            <Route path="edit" element={<EditStudentProfile />} />
          </Route>
          <Route path="settings" element={<StudentSettings />} />
        </Route>

        {/* Organizer Dashboard Routes */}
        <Route
          path="/organizer"
          element={
            <ProtectedRoute requiredRole="organizer">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="create-hackathon" element={<CreateHackathon />}>
            <Route index element={<Navigate to="step-1" replace />} />
            <Route path="step-1" element={<CreateHackathonStepOne />} />
            <Route path="step-2" element={<CreateHackathonStepTwo />} />
            <Route path="step-3" element={<CreateHackathonStepThree />} />
          </Route>
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="my-hackathons" element={<MyHackathons />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="teams-mentors" element={<TeamsMentors />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="evaluation" element={<EvaluationPanel />} />
          <Route path="evaluation/criteria" element={<EvaluationCriteria />} />
          <Route path="initialize-event" element={<InitializeEvent />} />
          <Route path="invite-mentors" element={<InviteMentors />} />
          <Route path="results" element={<ResultsCertificates />} />
          <Route path="hackathons/:hackathonId/edit-timeline" element={<EditTimeline />} />
          <Route path="hackathons/:hackathonId/manage" element={<ManageHackathon />} />
          <Route path="profile">
            <Route index element={<OrganizerProfile />} />
            <Route path="edit" element={<EditOrganizerProfile />} />
          </Route>
          <Route path="settings" element={<OrganizerSettings />} />

        </Route>

        {/* Mentor Dashboard Routes */}
        <Route
          path="/mentor"
          element={
            <ProtectedRoute requiredRole="mentor">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MentorDashboard />} />
          <Route path="mentorship-requests" element={<MentorshipRequests />} />
          <Route path="teams">
            <Route index element={<AssignedTeams />} />
            <Route path=":teamId/workspace" element={<TeamsPage />} />
            <Route path="join" element={<DiscoverTeams />} />
            <Route path="create" element={<CreateTeam />} />
          </Route>
          <Route path="feedback" element={<Feedback />} />
          <Route path="profile">
            <Route index element={<MentorProfile />} />
            <Route path="edit" element={<EditMentorProfile />} />
          </Route>
          <Route path="settings" element={<MentorSettings />} />

        </Route>

        {/* Admin Dashboard Routes - Protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="organizer-approvals" element={<OrganizerApprovals />} />
          <Route path="hackathon-approvals">
            <Route index element={<HackathonApprovals />} />
            <Route path="detail" element={<HackathonChangeRequest />} />
          </Route>
          <Route path="users" element={<UsersManagement />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="certificates" element={<AdminCertificates />} />
          <Route path="disputes" element={<AdminDisputes />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="profile">
            <Route index element={<AdminProfile />} />
            <Route path="edit" element={<EditAdminProfile />} />
          </Route>
          <Route path="settings" element={<AdminSettings />} />

        </Route>

        {/* Catch-all route for 404 */}
        <Route path="*" element={<div className="text-white p-10 font-bold text-2xl flex items-center justify-center min-h-[50vh]">404 | Page not found</div>} />
      </Routes>

      {/* Conditionally render Footer */}
      {!shouldHideFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

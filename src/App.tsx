import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Signup from "./pages/Signup";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import CourseManagement from "./pages/admin/CourseManagement";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminCalendar from "./pages/admin/AdminCalendar";
import Monitoring from "./pages/admin/Monitoring";
import Settings from "./pages/admin/Settings";
import HelpCenter from "./pages/admin/HelpCenter";
import Notifications from "./pages/admin/Notifications";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherCourses from "./pages/teacher/Courses";
import CourseDetail from "./pages/teacher/CourseDetail";
import AssignmentCreate from "./pages/teacher/AssignmentCreate";
import AssignmentReview from "./pages/teacher/AssignmentReview";
import Attendance from "./pages/teacher/Attendance";
import QuizEditor from "./pages/teacher/QuizEditor";
import CourseGrades from "./pages/teacher/CourseGrades";
import TeacherNotifications from "./pages/teacher/Notifications";
import TeacherSettings from "./pages/teacher/Settings";
import TeacherHelpCenter from "./pages/teacher/HelpCenter";
import TeacherCalendar from "./pages/teacher/Calendar";
import StudentDashboard from "./pages/student/Dashboard";
import CoursePlayer from "./pages/student/CoursePlayer";
import StudentCourses from "./pages/student/Courses";
import StudentAssignments from "./pages/student/Assignments";
import AssignmentSubmit from "./pages/student/AssignmentSubmit";
import QuizPlayer from "./pages/student/QuizPlayer";
import StudentGrades from "./pages/student/Grades";
import StudentCalendar from "./pages/student/StudentCalendar";
import StudentSettings from "./pages/student/Settings";
import StudentHelpCenter from "./pages/student/HelpCenter";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Register from "./pages/Register";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationProvider } from "@/contexts/NotificationContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NotificationProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute><CourseManagement /></ProtectedRoute>} />
            <Route path="/admin/courses/:id/edit" element={<ProtectedRoute><AdminCourseDetail /></ProtectedRoute>} />
            <Route path="/admin/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/admin/calendar" element={<ProtectedRoute><AdminCalendar /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin/help-center" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute><TeacherCourses /></ProtectedRoute>} />
            <Route path="/teacher/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute><AssignmentCreate /></ProtectedRoute>} />
            <Route path="/teacher/reviews" element={<ProtectedRoute><AssignmentReview /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/quiz/:quizId" element={<ProtectedRoute><QuizEditor /></ProtectedRoute>} />
            <Route path="/teacher/courses/:id/grades" element={<ProtectedRoute><CourseGrades /></ProtectedRoute>} />
            <Route path="/teacher/notifications" element={<ProtectedRoute><TeacherNotifications /></ProtectedRoute>} />
            <Route path="/teacher/settings" element={<ProtectedRoute><TeacherSettings /></ProtectedRoute>} />
            <Route path="/teacher/help-center" element={<ProtectedRoute><TeacherHelpCenter /></ProtectedRoute>} />
            <Route path="/teacher/calendar" element={<ProtectedRoute><TeacherCalendar /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/courses" element={<ProtectedRoute><StudentCourses /></ProtectedRoute>} />
            <Route path="/student/courses/:id/learn" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute><StudentAssignments /></ProtectedRoute>} />
            <Route path="/student/assignments/:id" element={<ProtectedRoute><AssignmentSubmit /></ProtectedRoute>} />
            <Route path="/student/quiz/:id" element={<ProtectedRoute><QuizPlayer /></ProtectedRoute>} />
            <Route path="/student/grades" element={<ProtectedRoute><StudentGrades /></ProtectedRoute>} />
            <Route path="/student/calendar" element={<ProtectedRoute><StudentCalendar /></ProtectedRoute>} />
            <Route path="/student/settings" element={<ProtectedRoute><StudentSettings /></ProtectedRoute>} />
            <Route path="/student/help-center" element={<ProtectedRoute><StudentHelpCenter /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

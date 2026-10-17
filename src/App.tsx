import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Signup from "./pages/Signup";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminInquiries from "./pages/admin/AdminInquiries";
import UserManagement from "./pages/admin/UserManagement";
import CourseManagement from "./pages/admin/CourseManagement";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminCalendar from "./pages/admin/AdminCalendar";
import Monitoring from "./pages/admin/Monitoring";
import Settings from "./pages/admin/Settings";
import HelpCenter from "./pages/admin/HelpCenter";
import Notifications from "./pages/admin/Notifications";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminCoupons from "./pages/admin/AdminCoupons";
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
import JsonCourseBuilder from "./pages/teacher/JsonCourseBuilder";
import CertificatePrograms from "./pages/teacher/CertificatePrograms";
import Leaderboard from "./pages/Leaderboard";
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
import StudentNotifications from "./pages/student/Notifications";
import StudentAttendance from "./pages/student/Attendance";
import StudentFlashcards from "./pages/student/Flashcards";
import StudentMnemonics from "./pages/student/Mnemonics";
import TeacherFlashcards from "./pages/teacher/Flashcards";
import TeacherMnemonics from "./pages/teacher/Mnemonics";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ExperienceOrbit from "./pages/ExperienceOrbit";
import Register from "./pages/Register";
import ServiceMaintenance from "./pages/ServiceMaintenance";

// Master Admin Imports
import MasterLogin from "./pages/master/MasterLogin";
import MasterDashboard from "./pages/master/MasterDashboard";
import MasterColleges from "./pages/master/MasterColleges";
import MasterCollegeDetail from "./pages/master/MasterCollegeDetail";
import MasterAccounts from "./pages/master/MasterAccounts";
import MasterCourses from "./pages/master/MasterCourses";
import MasterBilling from "./pages/master/MasterBilling";
import MasterCoupons from "./pages/master/MasterCoupons";
import MasterPlans from "./pages/master/MasterPlans";
import MasterBlogs from "./pages/master/MasterBlogs";
import MasterCareers from "./pages/master/MasterCareers";
import MasterAnalytics from "./pages/master/MasterAnalytics";
import MasterMonitoring from "./pages/master/MasterMonitoring";
import MasterRoles from "./pages/master/MasterRoles";
import BlogList from "./pages/blog/BlogList";
import BlogPostDetail from "./pages/blog/BlogPostDetail";
import Careers from "./pages/careers/Careers";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import FinanceTransactions from "./pages/finance/FinanceTransactions";
import FinanceInvoices from "./pages/finance/FinanceInvoices";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GatedFeatureRoute } from "./components/common/FeatureGate";

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
            <Route path="/experience" element={<ExperienceOrbit />} />
            <Route path="/explore" element={<ExperienceOrbit />} />
            <Route path="/presentation" element={<ExperienceOrbit />} />
            <Route path="/register" element={<Register />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPostDetail />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/service-maintenance" element={<ServiceMaintenance />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/student/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute><AdminCoupons /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute><AdminBilling /></ProtectedRoute>} />
            <Route path="/admin/inquiries" element={<ProtectedRoute><GatedFeatureRoute featureId="inquiries"><AdminInquiries /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><GatedFeatureRoute featureId="user_management"><UserManagement /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute><GatedFeatureRoute featureId="course_management"><CourseManagement /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/admin/courses/:id/edit" element={<ProtectedRoute><GatedFeatureRoute featureId="course_management"><AdminCourseDetail /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/admin/monitoring" element={<ProtectedRoute><GatedFeatureRoute featureId="advanced_analytics"><Monitoring /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/admin/leaderboard" element={<ProtectedRoute><GatedFeatureRoute featureId="leaderboard"><Leaderboard userRole="admin" /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/admin/calendar" element={<ProtectedRoute><GatedFeatureRoute featureId="calendar"><AdminCalendar /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin/help-center" element={<ProtectedRoute><GatedFeatureRoute featureId="ticket_raising"><HelpCenter /></GatedFeatureRoute></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute><GatedFeatureRoute featureId="course_management"><TeacherCourses /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/certificate-programs" element={<ProtectedRoute><GatedFeatureRoute featureId="certificates"><CertificatePrograms /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/leaderboard" element={<ProtectedRoute><GatedFeatureRoute featureId="leaderboard"><Leaderboard userRole="teacher" /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/courses/json-builder" element={<ProtectedRoute><GatedFeatureRoute featureId="ai_json_builder"><JsonCourseBuilder /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/courses/:id" element={<ProtectedRoute><GatedFeatureRoute featureId="course_management"><CourseDetail /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute><GatedFeatureRoute featureId="assignments"><AssignmentCreate /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/reviews" element={<ProtectedRoute><GatedFeatureRoute featureId="assignments"><AssignmentReview /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute><GatedFeatureRoute featureId="attendance_tracker"><Attendance /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/quiz/:quizId" element={<ProtectedRoute><GatedFeatureRoute featureId="quizzes"><QuizEditor /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/courses/:id/grades" element={<ProtectedRoute><GatedFeatureRoute featureId="certificates"><CourseGrades /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/notifications" element={<ProtectedRoute><TeacherNotifications /></ProtectedRoute>} />
            <Route path="/teacher/settings" element={<ProtectedRoute><TeacherSettings /></ProtectedRoute>} />
            <Route path="/teacher/help-center" element={<ProtectedRoute><GatedFeatureRoute featureId="ticket_raising"><TeacherHelpCenter /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/calendar" element={<ProtectedRoute><GatedFeatureRoute featureId="calendar"><TeacherCalendar /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/teacher/flashcards" element={<ProtectedRoute><TeacherFlashcards /></ProtectedRoute>} />
            <Route path="/teacher/mnemonics" element={<ProtectedRoute><TeacherMnemonics /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/courses" element={<ProtectedRoute><GatedFeatureRoute featureId="course_management"><StudentCourses /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/flashcards" element={<ProtectedRoute><StudentFlashcards /></ProtectedRoute>} />
            <Route path="/student/mnemonics" element={<ProtectedRoute><StudentMnemonics /></ProtectedRoute>} />
            <Route path="/student/leaderboard" element={<ProtectedRoute><GatedFeatureRoute featureId="leaderboard"><Leaderboard userRole="student" /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/courses/:id/learn" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute><GatedFeatureRoute featureId="assignments"><StudentAssignments /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/assignments/:id" element={<ProtectedRoute><GatedFeatureRoute featureId="assignments"><AssignmentSubmit /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/quiz/:id" element={<ProtectedRoute><GatedFeatureRoute featureId="quizzes"><QuizPlayer /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/grades" element={<ProtectedRoute><GatedFeatureRoute featureId="certificates"><StudentGrades /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/calendar" element={<ProtectedRoute><GatedFeatureRoute featureId="calendar"><StudentCalendar /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/settings" element={<ProtectedRoute><StudentSettings /></ProtectedRoute>} />
            <Route path="/student/help-center" element={<ProtectedRoute><GatedFeatureRoute featureId="ticket_raising"><StudentHelpCenter /></GatedFeatureRoute></ProtectedRoute>} />
            <Route path="/student/notifications" element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />
            <Route path="/student/announcements" element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />

            {/* Finance Department Routes */}
            <Route path="/finance" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
            <Route path="/finance/transactions" element={<ProtectedRoute><FinanceTransactions /></ProtectedRoute>} />
            <Route path="/finance/invoices" element={<ProtectedRoute><FinanceInvoices /></ProtectedRoute>} />

            {/* Master Admin Routes */}
            <Route path="/master/login" element={<MasterLogin />} />
            <Route path="/master" element={<ProtectedRoute><MasterDashboard /></ProtectedRoute>} />
            <Route path="/master/colleges" element={<ProtectedRoute><MasterColleges /></ProtectedRoute>} />
            <Route path="/master/colleges/:id" element={<ProtectedRoute><MasterCollegeDetail /></ProtectedRoute>} />
            <Route path="/master/accounts" element={<ProtectedRoute><MasterAccounts /></ProtectedRoute>} />
            <Route path="/master/courses" element={<ProtectedRoute><MasterCourses /></ProtectedRoute>} />
            <Route path="/master/billing" element={<ProtectedRoute><MasterBilling /></ProtectedRoute>} />
            <Route path="/master/coupons" element={<ProtectedRoute><MasterCoupons /></ProtectedRoute>} />
            <Route path="/master/plans" element={<ProtectedRoute><MasterPlans /></ProtectedRoute>} />
            <Route path="/master/blogs" element={<ProtectedRoute><MasterBlogs /></ProtectedRoute>} />
            <Route path="/master/careers" element={<ProtectedRoute><MasterCareers /></ProtectedRoute>} />
            <Route path="/master/analytics" element={<ProtectedRoute><MasterAnalytics /></ProtectedRoute>} />
            <Route path="/master/monitoring" element={<ProtectedRoute><MasterMonitoring /></ProtectedRoute>} />
            <Route path="/master/roles" element={<ProtectedRoute><MasterRoles /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

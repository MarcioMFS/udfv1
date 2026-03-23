import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ClassesPage } from './pages/ClassesPage'
import { ClassDetailsPage } from './pages/ClassDetailsPage'
import { MyEventsPage } from './pages/MyEventsPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { EventDetailsPage } from './pages/EventDetailsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminEventsPage } from './pages/admin/AdminEventsPage'
import { AdminClassesPage } from './pages/admin/AdminClassesPage'
import { AdminEmailsPage } from './pages/admin/AdminEmailsPage'
import { AdminBillingPage } from './pages/admin/AdminBillingPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import { TermsPage } from './pages/TermsPage'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen" style={{ backgroundColor: '#F0F2F7' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/classes" element={<ClassesPage />} />
                  <Route path="/classes/:id" element={<ClassDetailsPage />} />
                  <Route path="/my-events" element={<MyEventsPage />} />
                  <Route path="/events/create" element={<CreateEventPage />} />
                  <Route path="/events/:id" element={<EventDetailsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminDashboardPage />
                    </AdminRoute>
                  } />
                  <Route path="/admin/users" element={
                    <AdminRoute>
                      <AdminUsersPage />
                    </AdminRoute>
                  } />
                  <Route path="/admin/classes" element={
                    <AdminRoute>
                      <AdminClassesPage />
                    </AdminRoute>
                  } />
                  <Route path="/admin/events" element={
                    <AdminRoute>
                      <AdminEventsPage />
                    </AdminRoute>
                  } />
                  <Route path="/admin/emails" element={
                    <AdminRoute>
                      <AdminEmailsPage />
                    </AdminRoute>
                  } />
                  <Route path="/admin/faturamento" element={
                    <AdminRoute>
                      <AdminBillingPage />
                    </AdminRoute>
                  } />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
      <Toaster position="top-right" />
    </AuthProvider>
  )
}

export default App

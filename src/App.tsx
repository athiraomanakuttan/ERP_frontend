import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RolesPage } from '@/pages/RolesPage';
import { BranchesPage } from '@/pages/BranchesPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { ClientCompaniesPage } from '@/pages/ClientCompaniesPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectDetailsPage } from '@/pages/ProjectDetailsPage';
import { TasksPage } from '@/pages/TasksPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { LeavesPage } from '@/pages/LeavesPage';
import { HolidaysPage } from '@/pages/HolidaysPage';
import { AnnouncementsPage } from '@/pages/AnnouncementsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { WorkTimePage } from '@/pages/WorkTimePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { CustomerFormPage } from '@/pages/customers/CustomerFormPage';
import { InvoicesPage } from '@/pages/customers/InvoicesPage';
import { InvoiceFormPage } from '@/pages/customers/InvoiceFormPage';
import { PaymentsPage } from '@/pages/customers/PaymentsPage';
import { ProtectedRoute } from '@/components/organisms/ProtectedRoute';
import { AdminRoute } from '@/components/organisms/AdminRoute';
import { WorkTimeRoute } from '@/components/organisms/WorkTimeRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/client-companies" element={<ClientCompaniesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/leaves" element={<LeavesPage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/reports" element={<ReportsPage />} />

            <Route element={<WorkTimeRoute />}>
              <Route path="/work-time" element={<WorkTimePage />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/add" element={<CustomerFormPage />} />
              <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
              <Route path="/customers/invoices" element={<InvoicesPage />} />
              <Route path="/customers/invoices/create" element={<InvoiceFormPage />} />
              <Route path="/customers/invoices/:id/edit" element={<InvoiceFormPage />} />
              <Route path="/customers/payments/pending" element={<PaymentsPage />} />
              <Route path="/customers/payments/completed" element={<PaymentsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

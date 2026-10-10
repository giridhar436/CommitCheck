import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { PhaseOneFoundationPage } from '@/pages/PhaseOneFoundationPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'


import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ProjectsListPage } from '@/pages/projects/ProjectsListPage'
import { ProjectOverviewPage } from '@/pages/projects/ProjectOverviewPage'
import { ScopePage } from '@/pages/projects/ScopePage'
import { DocumentsPage } from '@/pages/projects/DocumentsPage'
import { MeetingsPage } from '@/pages/projects/MeetingsPage'
import { CommitmentsPage } from '@/pages/projects/CommitmentsPage'
import { CommitmentDetailPage } from '@/pages/commitments/CommitmentDetailPage'
import { ChangeRequestsPage } from '@/pages/projects/ChangeRequestsPage'
import { ChangeRequestDetailPage } from '@/pages/change-requests/ChangeRequestDetailPage'
import { ActivityPage } from '@/pages/projects/ActivityPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/design-system',
    element: <PhaseOneFoundationPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },

  // Authenticated Application Shell routes
  {
    element: <AppLayout />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/projects',
        element: <ProjectsListPage />,
      },
      {
        path: '/projects/:id',
        element: <ProjectOverviewPage />,
      },
      {
        path: '/projects/:id/scope',
        element: <ScopePage />,
      },
      {
        path: '/projects/:id/documents',
        element: <DocumentsPage />,
      },
      {
        path: '/projects/:id/meetings',
        element: <MeetingsPage />,
      },
      {
        path: '/projects/:id/commitments',
        element: <CommitmentsPage />,
      },
      {
        path: '/projects/:id/change-requests',
        element: <ChangeRequestsPage />,
      },
      {
        path: '/projects/:id/activity',
        element: <ActivityPage />,
      },
      {
        path: '/commitments/:id',
        element: <CommitmentDetailPage />,
      },
      {
        path: '/change-requests/:id',
        element: <ChangeRequestDetailPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
])

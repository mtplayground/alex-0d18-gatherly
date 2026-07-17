import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventFormPage } from './pages/EventFormPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/signin',
    element: <SignInPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/events/new',
    element: <EventFormPage />,
  },
  {
    path: '/events/:eventId',
    element: <EventDetailPage />,
  },
  {
    path: '/events/:eventId/edit',
    element: <EventFormPage />,
  },
  {
    path: '/organizer/events',
    element: <OrganizerDashboardPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/profile',
    element: <ProfileSettingsPage />,
  },
  {
    path: '/signup',
    element: <SignUpPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
]);

import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
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

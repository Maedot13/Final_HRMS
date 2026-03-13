import { createBrowserRouter } from 'react-router-dom';
import ComponentSandboxPage from '../pages/ComponentSandboxPage';

const router = createBrowserRouter([
    {
        path: '/',
        element: <div>Dashboard Content Pending</div>,
    },
    {
        path: '/login',
        element: <div>Login Page Pending</div>,
    },
    {
        path: '/force-password-change',
        element: <div>Force Password Change Pending</div>,
    },
    {
        path: '/sandbox',
        element: <ComponentSandboxPage />,
    },
]);

export default router;

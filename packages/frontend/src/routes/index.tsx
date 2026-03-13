import { createBrowserRouter } from 'react-router-dom';

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
]);

export default router;

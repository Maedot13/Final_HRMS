import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FiAlertTriangle, FiHome, FiArrowLeft } from 'react-icons/fi';

export default function ErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();

    let title = 'Unexpected Error';
    let message = 'Something went wrong. Please try again later or contact support.';

    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            title = '404 - Page Not Found';
            message = "Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.";
        } else if (error.status === 401) {
            title = '401 - Unauthorized';
            message = 'You do not have permission to view this page.';
        } else if (error.status === 503) {
            title = '503 - Service Unavailable';
            message = "Looks like our API is down. We're working on it!";
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center ring-1 ring-gray-100">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 text-danger mb-6">
                    <FiAlertTriangle className="w-8 h-8" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                    {message}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                        variant="secondary" 
                        leftIcon={<FiArrowLeft />}
                        onClick={() => navigate(-1)}
                    >
                        Go Back
                    </Button>
                    <Button 
                        variant="primary" 
                        leftIcon={<FiHome />}
                        onClick={() => navigate('/')}
                    >
                        Return Home
                    </Button>
                </div>

                {import.meta.env.DEV && !isRouteErrorResponse(error) && (
                    <div className="mt-8 pt-6 border-t border-gray-100 text-left">
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2">Debug Info</p>
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto font-mono text-danger max-h-40">
                            {error instanceof Error ? error.message : JSON.stringify(error)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}


import { useQuery } from '@tanstack/react-query';
import { getMyAppraisals, getAutomatedMetrics } from '../api/appraisals';
import { Card } from '../components/ui/Card';
import { FiTrendingUp, FiAward, FiActivity, FiClock, FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';

export default function AppraisalsPage() {
    const user = useAuthStore((state) => state.user);
    const { data: appraisals, isLoading: loadingManual, isError: errorManual } = useQuery({
        queryKey: ['my-appraisals'],
        queryFn: getMyAppraisals,
        retry: false
    });

    const { data: automated, isLoading: loadingAuto, isError: errorAuto } = useQuery({
        queryKey: ['automated-metrics'],
        queryFn: getAutomatedMetrics,
        retry: false
    });

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'text-green-600';
        if (score >= 70) return 'text-blue-600';
        if (score >= 50) return 'text-orange-600';
        return 'text-red-600';
    };

    const getBgColor = (score: number) => {
        if (score >= 85) return 'bg-green-100';
        if (score >= 70) return 'bg-blue-100';
        if (score >= 50) return 'bg-orange-100';
        return 'bg-red-100';
    };

    if (loadingManual || loadingAuto) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Performance & Efficiency</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track your real-time system activity and view formal HR evaluations.
                    </p>
                </div>
                {(user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMIN') && (
                    <Link to="/evaluations/new">
                        <Button variant="primary">
                            + Perform New Evaluation
                        </Button>
                    </Link>
                )}
            </div>

            { (errorManual || errorAuto) ? (
                <Card className="p-12 text-center bg-white shadow-sm border-none">
                    <FiActivity className="w-12 h-12 mx-auto mb-4 text-orange-300" />
                    <h3 className="text-lg font-bold text-gray-900">Efficiency Data Unavailable</h3>
                    <p className="text-gray-500 mt-2">There was an error loading your performance metrics. Please ensure your employee profile is correctly set up.</p>
                </Card>
            ) : (
                <>
                    {/* Automated Metrics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white shadow-sm border-none" padding="md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FiActivity className="text-blue-600 w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-gray-900">Presence Score</h3>
                        </div>
                        <span className={`text-2xl font-bold ${getScoreColor(automated?.presenceScore)}`}>
                            {automated?.presenceScore}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full ${getBgColor(automated?.presenceScore).replace('bg-', 'bg-').split(' ')[0].replace('100', '500')}`} 
                            style={{ width: `${automated?.presenceScore}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <FiClock className="w-3 h-3" /> {automated?.automatedSummary}
                    </p>
                </Card>

                <Card className="bg-white shadow-sm border-none" padding="md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FiCheckCircle className="text-purple-600 w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-gray-900">System Activity</h3>
                        </div>
                        <span className={`text-2xl font-bold ${getScoreColor(automated?.activityScore)}`}>
                            {automated?.activityScore}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full ${getBgColor(automated?.activityScore).replace('bg-', 'bg-').split(' ')[0].replace('100', '500')}`} 
                            style={{ width: `${automated?.activityScore}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Activity Level: <strong>{automated?.activityLevel}</strong> (Last 30 days)</p>
                </Card>
            </div>

            <div className="pt-4 border-t border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Formal HR Evaluations</h2>
                {appraisals?.formalEvaluations && appraisals.formalEvaluations.length === 0 ? (
                    <Card className="p-12 text-center text-gray-500 bg-white shadow-sm border-none">
                        <FiTrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No formal evaluations from HR yet.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {appraisals?.formalEvaluations?.map((appraisal: any) => (
                        <Card key={appraisal.id} className="bg-white shadow-sm border-none overflow-hidden" padding="none">
                            <div className="border-l-4 border-primary p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{appraisal.period}</h3>
                                        <p className="text-sm text-gray-500">Evaluated on {format(new Date(appraisal.createdAt), 'PPP')}</p>
                                    </div>
                                    <div className="mt-4 md:mt-0 flex gap-4">
                                        <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-semibold">Efficiency</div>
                                            <div className={`text-2xl font-bold ${getScoreColor(appraisal.efficiencyScore)}`}>
                                                {appraisal.efficiencyScore}%
                                            </div>
                                        </div>
                                        <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-semibold">Work Output</div>
                                            <div className={`text-2xl font-bold ${getScoreColor(appraisal.workOutputScore)}`}>
                                                {appraisal.workOutputScore}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {appraisal.comments && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h4 className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                                            <FiAward className="mr-1 text-primary" /> Evaluator Comments
                                        </h4>
                                        <p className="text-gray-600 text-sm italic">"{appraisal.comments}"</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            </div>
                </>
            )}
        </div>
    );
}

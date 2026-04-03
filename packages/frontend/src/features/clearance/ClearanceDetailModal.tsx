import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { clearanceApi } from '../../api/clearance';
import { toast } from 'react-toastify';
import { FiCheck, FiX, FiInfo } from 'react-icons/fi';

interface ClearanceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: number | null;
}

export function ClearanceDetailModal({ isOpen, onClose, requestId }: ClearanceDetailModalProps) {
    const user = useAuthStore(state => state.user);
    const queryClient = useQueryClient();

    const { data: request, isLoading } = useQuery({
        queryKey: ['clearanceRequest', requestId],
        queryFn: async () => {
            if (!requestId) return null;
            const res = await clearanceApi.getById(requestId);
            return res.data;
        },
        enabled: !!requestId && isOpen,
    });

    const approveMutation = useMutation({
        mutationFn: (unitId: number) => 
            clearanceApi.processCheck(requestId!, unitId, { status: 'APPROVED' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clearanceRequest', requestId] });
            queryClient.invalidateQueries({ queryKey: ['clearanceRequests'] });
            toast.success('Check approved');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Approval failed');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: ({ unitId, comment }: { unitId: number, comment: string }) => 
            clearanceApi.processCheck(requestId!, unitId, { status: 'REJECTED', comment }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clearanceRequest', requestId] });
            queryClient.invalidateQueries({ queryKey: ['clearanceRequests'] });
            toast.success('Check rejected');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Rejection failed');
        }
    });

    const handleReject = (unitId: number) => {
        const comment = window.prompt('Please provide a reason for rejection:');
        if (comment) {
            rejectMutation.mutate({ unitId, comment });
        }
    };

    const isActionable = (unitName: string) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        
        const name = unitName.toUpperCase();
        if (user.role === 'HR_OFFICER' && (name === 'HR' || name === 'HUMAN RESOURCES')) return true;
        if (user.role === 'FINANCE_OFFICER' && name === 'FINANCE') return true;
        
        // Department Head check
        if (user.role === 'DEPARTMENT_HEAD' && request?.employee) {
            if (name === 'DEPARTMENT HEAD' || name === request.employee.deptLegacy?.toUpperCase()) {
                return true;
            }
        }
        
        return false;
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Clearance Details" size="lg">
            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : request ? (
                <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg text-sm">
                        <div>
                            <span className="text-gray-500 block">Employee</span>
                            <span className="font-medium text-gray-900">{request.employee?.name}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Employee ID</span>
                            <span className="font-medium text-gray-900 font-mono italic">{request.employee?.employeeId}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Reason</span>
                            <span className="font-medium text-gray-900">{request.reason}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Status</span>
                            <Badge variant={request.status === 'APPROVED' ? 'approved' : 'warning'}>
                                {request.status}
                            </Badge>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Initiated Date</span>
                            <span className="font-medium text-gray-900">
                                {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <FiInfo /> Unit Clearances
                        </h4>
                        <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
                            {request.checks?.map((check: any) => (
                                <div key={check.unitId} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900">{check.unit?.name}</p>
                                        {check.comment && (
                                            <p className="text-xs text-gray-500 mt-1 italic">"{check.comment}"</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <Badge 
                                                variant={
                                                    check.status === 'APPROVED' ? 'approved' : 
                                                    check.status === 'REJECTED' ? 'rejected' : 'warning'
                                                }
                                            >
                                                {check.status}
                                            </Badge>
                                            
                                            {check.status === 'PENDING' && isActionable(check.unit?.name || '') && (
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20 animate-pulse">
                                                    Action Required
                                                </span>
                                            )}
                                        </div>
                                        
                                        {check.status === 'PENDING' && (
                                            <div className="flex gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-green-600 hover:bg-green-50"
                                                    onClick={() => approveMutation.mutate(check.unitId)}
                                                    isLoading={approveMutation.isPending && approveMutation.variables === check.unitId}
                                                >
                                                    <FiCheck />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => handleReject(check.unitId)}
                                                    isLoading={rejectMutation.isPending && rejectMutation.variables?.unitId === check.unitId}
                                                >
                                                    <FiX />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <Button variant="secondary" onClick={onClose}>Close</Button>
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center text-gray-500">Failed to load data.</div>
            )}
        </Modal>
    );
}

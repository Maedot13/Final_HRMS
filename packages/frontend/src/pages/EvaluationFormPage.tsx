import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { createAppraisal } from '../api/appraisals';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FiUser, FiAward, FiMessageSquare, FiSend, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const EvaluationFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialEmployeeId = searchParams.get('employeeId');

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch employee if ID shared in URL
    useQuery({
        queryKey: ['employee-preselect', initialEmployeeId],
        queryFn: async () => {
            const resp = await apiClient.get(`/employees/${initialEmployeeId}`);
            const emp = resp.data; // Fixed to resp.data
            setSelectedEmployee(emp);
            return emp;
        },
        enabled: !!initialEmployeeId && !selectedEmployee
    });
    const [formData, setFormData] = useState({
        period: `${new Date().getFullYear()} Annual`,
        qualityScore: 80,
        punctualityScore: 80,
        knowledgeScore: 80,
        teamworkScore: 80,
        workOutputScore: 80,
        comments: ''
    });

    // Calculate aggregate efficiency score (weighted average)
    const efficiencyScore = Math.round(
        (formData.qualityScore * 0.4) + 
        (formData.punctualityScore * 0.2) + 
        (formData.knowledgeScore * 0.2) + 
        (formData.teamworkScore * 0.2)
    );

    const { data: employees, isLoading: loadingEmployees, isError, error } = useQuery({
        queryKey: ['employees', debouncedSearchTerm],
        queryFn: async () => {
            const resp = await apiClient.get(`/employees?search=${debouncedSearchTerm}`);
            return resp.data || []; // Fixed to resp.data (and default to array if null)
        },
        enabled: debouncedSearchTerm.length > 2
    });

    const createMutation = useMutation({
        mutationFn: createAppraisal,
        onSuccess: () => {
            toast.success('BDU Efficiency Form submitted for HR approval');
            navigate('/evaluations');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to submit evaluation');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Auto-select if the user searched and exactly one employee is found but they didn't click it
        let targetEmployee = selectedEmployee;
        if (!targetEmployee && employees && employees.length === 1) {
            targetEmployee = employees[0];
            setSelectedEmployee(targetEmployee);
        }

        if (!targetEmployee) return toast.error('Please select an employee from the dropdown list menu');
        
        createMutation.mutate({
            employeeId: targetEmployee.id,
            ...formData,
            efficiencyScore // Calculated aggregate
        });
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-fade-in mb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    BDU Efficiency Form
                </h1>
                <p className="text-gray-500 mt-1">Institutional performance appraisal based on Bahir Dar University standards.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. SELECT EMPLOYEE */}
                <Card className="p-6 bg-white shadow-sm border-none">
                    <div className="flex items-center gap-2 mb-6 text-primary">
                        <FiUser className="text-xl" />
                        <h2 className="text-xl font-bold text-gray-900">1. Select Employee</h2>
                    </div>

                    <div className="relative mb-4">
                        <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
                        <input 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm"
                            placeholder="Type name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {loadingEmployees && <p className="text-sm text-gray-500 p-2">Searching...</p>}
                    {isError && <p className="text-sm text-red-500 p-2 font-bold bg-red-50 rounded mt-1">Error searching: {(error as any)?.response?.data?.message || (error as any)?.message}</p>}
                    {!loadingEmployees && !isError && employees?.length === 0 && debouncedSearchTerm.length > 2 && (
                        <p className="text-sm text-orange-500 p-2 font-bold bg-orange-50 rounded mt-1">No employees found for "{debouncedSearchTerm}". (Only employees in your department/campus can be evaluated).</p>
                    )}
                    
                    {employees && employees.length > 0 && (

                        <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 bg-gray-50/30">
                            {employees.map((emp: any) => (
                                <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`w-full flex items-center justify-between p-4 hover:bg-white transition-colors ${selectedEmployee?.id === emp.id ? 'bg-white border-2 border-primary rounded-xl' : ''}`}
                                >
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">{emp.name}</p>
                                        <p className="text-xs text-gray-500">{emp.position}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedEmployee?.id === emp.id ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                                        {selectedEmployee?.id === emp.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                {/* 2. BDU CRITERIA */}
                <Card className="p-8 bg-white shadow-sm border-none">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 text-blue-600">
                            <FiAward className="text-2xl" />
                            <h2 className="text-xl font-bold text-gray-900">2. BDU Evaluation Criteria</h2>
                        </div>
                        <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                            <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Overall Efficiency</p>
                            <p className="text-2xl font-black text-blue-600">{efficiencyScore}%</p>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* Criterion 1 */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="font-bold text-gray-900">Work Quality & Resource Efficiency</h4>
                                    <p className="text-xs text-gray-400">Weight: 40%</p>
                                </div>
                                <span className="text-xl font-black text-primary">{formData.qualityScore}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" 
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                value={formData.qualityScore}
                                onChange={(e) => setFormData({...formData, qualityScore: parseInt(e.target.value)})}
                            />
                        </div>

                        {/* Criterion 2 */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="font-bold text-gray-900">Punctuality & Discipline</h4>
                                    <p className="text-xs text-gray-400">Weight: 20%</p>
                                </div>
                                <span className="text-xl font-black text-primary">{formData.punctualityScore}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" 
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                value={formData.punctualityScore}
                                onChange={(e) => setFormData({...formData, punctualityScore: parseInt(e.target.value)})}
                            />
                        </div>

                        {/* Criterion 3 */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="font-bold text-gray-900">Job Knowledge & Skill Application</h4>
                                    <p className="text-xs text-gray-400">Weight: 20%</p>
                                </div>
                                <span className="text-xl font-black text-primary">{formData.knowledgeScore}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" 
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                value={formData.knowledgeScore}
                                onChange={(e) => setFormData({...formData, knowledgeScore: parseInt(e.target.value)})}
                            />
                        </div>

                        {/* Criterion 4 */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="font-bold text-gray-900">Teamwork & Institutional Professionalism</h4>
                                    <p className="text-xs text-gray-400">Weight: 20%</p>
                                </div>
                                <span className="text-xl font-black text-primary">{formData.teamworkScore}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" 
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                value={formData.teamworkScore}
                                onChange={(e) => setFormData({...formData, teamworkScore: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>
                </Card>

                {/* 3. WORK OUTPUT */}
                <Card className="p-8 bg-white shadow-sm border-none">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-primary">
                            <FiAward className="text-xl" />
                            <h2 className="text-xl font-bold text-gray-900">3. Work Output Assessment</h2>
                        </div>
                        <span className="text-2xl font-black text-primary">{formData.workOutputScore}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" 
                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                        value={formData.workOutputScore}
                        onChange={(e) => setFormData({...formData, workOutputScore: parseInt(e.target.value)})}
                    />
                    <div className="mt-8">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Evaluation Period</label>
                        <Input 
                            value={formData.period}
                            onChange={(e) => setFormData({...formData, period: e.target.value})}
                            placeholder="e.g. 2025 Annual"
                        />
                    </div>
                </Card>

                <Card className="p-6 bg-white shadow-sm border-none">
                    <div className="flex items-center gap-2 mb-4 text-gray-500">
                        <FiMessageSquare className="text-xl" />
                        <h2 className="text-xl font-bold text-gray-900">3. Final Comments</h2>
                    </div>
                    <textarea 
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm min-h-[120px] focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-inner"
                        placeholder="Provide detailed feedback on the employee's performance..."
                        value={formData.comments}
                        onChange={(e) => setFormData({...formData, comments: e.target.value})}
                    />
                </Card>

                <div className="flex justify-end pt-4">
                    <Button 
                        type="submit" 
                        variant="primary" 
                        size="lg" 
                        leftIcon={<FiSend />}
                        isLoading={createMutation.isPending}
                        className="shadow-xl shadow-primary/20 px-12 py-4"
                    >
                        Submit to HR
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EvaluationFormPage;

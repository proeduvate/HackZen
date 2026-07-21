import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';

const HackathonApprovals = () => {
    const navigate = useNavigate();
    const [approvals, setApprovals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchApprovals = async () => {
            setIsLoading(true);
            try {
                const { data } = await apiClient.get('/hackathon/admin/pending');
                setApprovals(data);
            } catch (error) {
                console.error("Failed to fetch approvals:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchApprovals();
    }, []);

    return (
        <div className="p-10 space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold text-white">Hackathon Approvals</h2>
                <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Sector: Admin Oversight // Pending Verification</p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass p-6 rounded-2xl border border-white/5 animate-pulse h-24" />
                    ))}
                </div>
            ) : approvals.length > 0 ? (
                <div className="space-y-4">
                    {approvals.map((hack) => (
                        <div 
                            key={hack.id} 
                            className="glass p-6 rounded-2xl border border-white/10 flex justify-between items-center group cursor-pointer hover:border-blue-500/50 transition-all bg-white/5"
                            onClick={() => navigate(`/admin/hackathon-approvals/detail?id=${hack.id}`)}
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-xl shadow-lg border border-blue-500/20">
                                    🏛️
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{hack.title}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                            hack.status === 'Changes Requested' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        }`}>
                                            {hack.status}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">{hack.submittedOn || 'Recently'}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="px-6 py-2 bg-blue-600/10 text-blue-400 rounded-xl text-sm font-bold border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg">
                                Review Request
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass p-16 rounded-2xl border border-dashed border-white/10 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">📡</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Pending Approvals</h3>
                    <p className="text-gray-400">All hackathon sectors are currently verified and operational.</p>
                </div>
            )}
        </div>
    );
};

export default HackathonApprovals;

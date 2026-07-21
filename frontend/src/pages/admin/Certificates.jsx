import React, { useState, useEffect } from 'react';
import { fetchCertificates, verifyCertificate, revokeCertificate } from '../../services/admin/adminCertificatesApi';

const AdminCertificates = () => {
    const [activeTab, setActiveTab] = useState('All Certificates');
    const [searchId, setSearchId] = useState('');
    const [certificates, setCertificates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        const loadCerts = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCertificates();
                setCertificates(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCerts();
    }, []);

    const handleVerify = async () => {
        if (!searchId.trim()) return;
        setVerifying(true);
        try {
            const result = await verifyCertificate(searchId);
            alert(result.message);
        } catch (error) {
            console.error(error);
        } finally {
            setVerifying(false);
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm("Are you sure you want to revoke this certificate? This action will permanently mark it as revoked on the public record.")) return;
        setActionLoading(id);
        try {
            const result = await revokeCertificate(id);
            if (result.success) {
                setCertificates(result.updatedData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    const typeColors = {
        'Winner': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'Participation': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Mentor': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Top Performer': 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Certificate Management</h1>
                <p className="text-gray-400">Issue, verify, and manage platform authenticity certificates.</p>
            </div>

            {/* Verification Panel */}
            <div className="glass p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 w-full">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            Instant Verification
                        </h3>
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Enter Validation ID (e.g. CERT-2024-XYZ)"
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-light"
                                />
                            </div>
                            <button 
                                onClick={handleVerify}
                                disabled={verifying || !searchId.trim()}
                                className="disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all outline-none">
                                {verifying ? 'Verifying...' : 'Verify Now'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                {/* Table Header/Filters */}
                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                        {['All Certificates', 'Issued', 'Revoked'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveTab(filter)}
                                className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === filter
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-all border-white/10">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                            Filter
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-all border-white/10">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Response Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.03]">
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Recipient</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Hackathon/Event</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Type</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Validation ID</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Date Issued</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr><td colSpan="6" className="text-center py-10 text-gray-500 italic text-xs animate-pulse">Fetching cryptographic identities...</td></tr>
                            ) : (activeTab === 'All Certificates' ? certificates : certificates.filter(c => c.status === activeTab)).map((cert) => (
                                <tr key={cert.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={cert.recipient.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10 shadow-lg" />
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{cert.recipient.name}</p>
                                                <p className="text-xs text-gray-500 lowercase">{cert.recipient.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-300">{cert.event}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${typeColors[cert.type]}`}>
                                            {cert.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-mono text-gray-400">{cert.validationId}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-400">{cert.dateIssued}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {cert.status === 'Revoked' ? (
                                                <span className="px-3 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                                                    Revoked
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleRevoke(cert.id)}
                                                    disabled={actionLoading === cert.id}
                                                    className="disabled:opacity-50 text-gray-500 hover:text-red-400 text-xs font-semibold transition-colors">
                                                    {actionLoading === cert.id ? 'Revoking...' : 'Revoke'}
                                                </button>
                                            )}
                                            <button className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors">Details</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer/Pagination Placeholder */}
                <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <p className="text-xs text-gray-500">Showing 1 to 4 of 24 entries</p>
                    <div className="flex gap-2">
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center glass border-white/10 text-gray-400 disabled:opacity-30" disabled>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white font-bold text-xs">1</button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center glass border-white/10 text-gray-400 text-xs hover:border-white/20">2</button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center glass border-white/10 text-gray-400 hover:border-white/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCertificates;

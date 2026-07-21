import React, { useEffect, useMemo, useState } from 'react';
import {
    fetchCertificates,
    verifyCertificate,
    downloadCertificate,
    downloadAllCertificates,
    shareTranscript
} from '../../services/student/certificatesApi';

const StudentCertificates = () => {
    const [certId, setCertId] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedResult, setVerifiedResult] = useState(() => {
        const saved = sessionStorage.getItem('lastVerifiedCert');
        return saved ? JSON.parse(saved) : null;
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [certificates, setCertificates] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCertificates();
                setCertificates(data);
            } catch (error) {
                console.error('Failed to fetch certificates:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        if (verifiedResult) {
            sessionStorage.setItem('lastVerifiedCert', JSON.stringify(verifiedResult));
        }
    }, [verifiedResult]);

    const filteredCertificates = useMemo(() => (
        certificates.filter((cert) =>
            cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.issuer.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ), [certificates, searchQuery]);

    const stats = useMemo(() => ({
        total: certificates.length,
        verified: certificates.filter((cert) => cert.status === 'Verified').length,
        pending: certificates.filter((cert) => cert.status !== 'Verified').length,
    }), [certificates]);

    const handleVerify = async () => {
        if (!certId.trim()) return;

        setIsVerifying(true);
        setVerifiedResult(null);

        try {
            const result = await verifyCertificate(certId);
            setVerifiedResult(result);
        } catch (error) {
            console.error('Verification failed:', error);
            setVerifiedResult({
                status: 'error',
                message: 'Internal verification link failure',
                recipient: '-',
                event: '-',
                date: '-'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDownloadIndividual = async (id) => {
        setCertificates((prev) => prev.map((cert) => (
            cert.id === id ? { ...cert, isDownloading: true } : cert
        )));

        try {
            await downloadCertificate(id);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setCertificates((prev) => prev.map((cert) => (
                cert.id === id ? { ...cert, isDownloading: false } : cert
            )));
        }
    };

    const handleDownloadAll = async () => {
        setIsDownloadingAll(true);
        try {
            await downloadAllCertificates();
        } catch (error) {
            console.error('Bulk download failed:', error);
        } finally {
            setIsDownloadingAll(false);
        }
    };

    const handleShareTranscript = async () => {
        setIsSharing(true);
        try {
            await shareTranscript();
        } catch (error) {
            console.error('Share failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-500 max-w-5xl mx-auto w-full">
            <div className="mb-4 flex-none">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    My <span className="gradient-text">Certificates</span>
                </h1>
                <p className="text-[10px] text-gray-400">Browse, verify, and share every achievement in the same visual style as your upcoming hackathons feed.</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Credentials</p>
                        <p className="text-xl font-bold text-white">{stats.total.toString().padStart(2, '0')}</p>
                    </div>
                    <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Verified Records</p>
                        <p className="text-xl font-bold text-emerald-400">{stats.verified.toString().padStart(2, '0')}</p>
                    </div>
                    <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pending Review</p>
                        <p className="text-xl font-bold text-amber-400">{stats.pending.toString().padStart(2, '0')}</p>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="xl:w-3/5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <h2 className="text-base font-bold text-white">Achievement Collection</h2>
                            <div className="w-full sm:w-64">
                                <input
                                    type="text"
                                    placeholder="Search by title, issuer, or ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-navy-900/50 border border-white/10 text-white px-3 py-1.5 text-[10px] rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-500 shadow-inner"
                                />
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((item) => (
                                    <div key={item} className="glass rounded-xl border border-white/5 h-[200px] animate-pulse bg-navy-900/40" />
                                ))}
                            </div>
                        ) : filteredCertificates.length === 0 ? (
                            <div className="glass rounded-xl border border-white/5 p-6 text-center shadow-sm">
                                <h3 className="text-sm font-bold text-white mb-1">No certificates found</h3>
                                <p className="text-[10px] text-gray-400">Try a different keyword to search your credentials.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredCertificates.map((cert) => (
                                    <div
                                        key={cert.id}
                                        className="glass rounded-xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 group flex flex-col overflow-hidden shadow-sm"
                                    >
                                        <div className="h-24 relative overflow-hidden">
                                            <img
                                                src={cert.image}
                                                alt={cert.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/30 to-transparent" />
                                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-bold text-white uppercase">
                                                {cert.category}
                                            </div>
                                            <div className="absolute bottom-2 left-3">
                                                <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest">{cert.issuer}</p>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-1.5 gap-2">
                                                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                                    {cert.title}
                                                </h3>
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                                                    cert.status === 'Verified'
                                                        ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                                }`}>
                                                    {cert.status}
                                                </span>
                                            </div>

                                            <p className="text-gray-400 text-[10px] mb-3">
                                                Credential ID: <span className="font-mono text-gray-300">{cert.id}</span>
                                            </p>

                                            <div className="mt-auto pt-3 border-t border-white/5 space-y-3">
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-gray-400">Issued</span>
                                                    <span className="text-white font-semibold">{cert.date}</span>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setCertId(cert.id)}
                                                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg border border-white/5 transition-colors"
                                                    >
                                                        Use for Verify
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadIndividual(cert.id)}
                                                        disabled={cert.isDownloading}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded-lg font-bold transition-colors disabled:opacity-50 shadow-sm"
                                                    >
                                                        {cert.isDownloading ? '...' : 'Download'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="xl:w-2/5">
                        <div className="glass p-4 sm:p-5 rounded-xl border border-blue-500/20 shadow-md relative overflow-hidden xl:sticky xl:top-0">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-base font-bold text-white mb-1">Credential Center</h3>
                                    <p className="text-[10px] text-gray-400 italic">Verify a certificate or export your full achievement history.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleShareTranscript}
                                        disabled={isSharing}
                                        className="py-2 bg-white/5 hover:bg-white/10 text-[10px] text-white font-bold rounded-lg border border-white/10 transition-colors disabled:opacity-50"
                                    >
                                        {isSharing ? 'Sharing...' : 'Share Transcript'}
                                    </button>
                                    <button
                                        onClick={handleDownloadAll}
                                        disabled={isDownloadingAll}
                                        className="py-2 bg-gradient-to-r from-blue-600 to-blue-600 text-[10px] text-white font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        {isDownloadingAll ? 'Preparing...' : 'Download All'}
                                    </button>
                                </div>

                                <div className="glass p-4 rounded-xl border border-white/5 shadow-sm">
                                    <h4 className="text-sm font-bold text-white mb-2">Certificate Verification</h4>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={certId}
                                            onChange={(e) => setCertId(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                            placeholder="e.g., PE-2024-NX8829-VZ"
                                            className="w-full bg-navy-900/50 border border-white/10 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-500 font-mono text-[10px] uppercase shadow-inner"
                                        />

                                        <button
                                            onClick={handleVerify}
                                            disabled={isVerifying || !certId.trim()}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
                                        >
                                            {isVerifying ? 'Verifying...' : 'Verify Certificate'}
                                        </button>
                                    </div>

                                    {verifiedResult && (
                                        <div className={`mt-3 rounded-xl border p-3 shadow-inner ${
                                            verifiedResult.status === 'success'
                                                ? 'bg-emerald-500/10 border-emerald-500/20'
                                                : 'bg-red-500/10 border-red-500/20'
                                        }`}>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${
                                                verifiedResult.status === 'success' ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                                {verifiedResult.status === 'success' ? 'Authentic Record' : 'Invalid ID'}
                                            </p>
                                            <div className="space-y-1.5 text-[10px]">
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-gray-400">Recipient</span>
                                                    <span className="text-white font-semibold text-right">{verifiedResult.recipient}</span>
                                                </div>
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-gray-400">Event</span>
                                                    <span className="text-white font-semibold text-right">{verifiedResult.event}</span>
                                                </div>
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-gray-400">Issued</span>
                                                    <span className="text-white font-semibold text-right">{verifiedResult.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="glass p-4 rounded-xl border border-white/5 shadow-sm">
                                    <h4 className="text-sm font-bold text-white mb-1.5">Achievement Notes</h4>
                                    <div className="space-y-1.5 text-[9px] text-gray-400">
                                        <p>Verified certificates are ready for transcript sharing and portfolio downloads.</p>
                                        <p>Pending credentials remain visible here so you can track new awards in one place.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentCertificates;

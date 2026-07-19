import React, { useEffect, useMemo, useState } from 'react';
import {
    fetchCertificates,
    verifyCertificate,
    downloadAllCertificates,
    shareTranscript,
    uploadCertificate,
    updateCertificate,
    deleteCertificate,
    normalizeCertificate,
} from '../../services/student/certificatesApi';

const getUploadErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (typeof responseData?.detail === 'string') return responseData.detail;
    if (Array.isArray(responseData?.detail)) {
        return responseData.detail
            .map((item) => item?.msg || item?.message)
            .filter(Boolean)
            .join(', ') || 'Invalid upload request';
    }
    if (responseData?.error?.detail) return responseData.error.detail;
    if (responseData?.error?.message) return responseData.error.message;
    if (error?.message) return error.message;

    return 'Failed to save certificate';
};

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
    const [uploadForm, setUploadForm] = useState({
        title: '',
        completionDate: '',
        description: '',
        file: null,
    });
    const [editId, setEditId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

    const handleUploadChange = (event) => {
        const { name, value, files } = event.target;
        setUploadForm((prev) => ({
            ...prev,
            [name]: name === 'file' ? files[0] : value,
        }));
    };

    const resetUploadForm = () => {
        setUploadForm({ title: '', completionDate: '', description: '', file: null });
        setEditId(null);
        setUploadError('');
        setIsUploadModalOpen(false);
    };

    const openUploadModal = () => {
        setUploadForm({ title: '', completionDate: '', description: '', file: null });
        setEditId(null);
        setUploadError('');
        setIsUploadModalOpen(true);
    };

    const handleEditCertificate = (cert) => {
        setEditId(cert.id);
        setUploadForm({
            title: cert.title,
            completionDate: cert.date,
            description: cert.description || '',
            file: null,
        });
        setUploadError('');
        setIsUploadModalOpen(true);
    };

    const handleDeleteCertificate = async (certificateId) => {
        if (!window.confirm('Delete this certificate? This cannot be undone.')) return;
        await deleteCertificate(certificateId);
        setCertificates((prev) => prev.filter((cert) => cert.id !== certificateId));
        if (editId === certificateId) resetUploadForm();
    };

    const handleSubmitUpload = async (event) => {
        event.preventDefault();
        setUploadError('');

        if (!uploadForm.title.trim()) {
            setUploadError('Title is required');
            return;
        }

        if (!uploadForm.completionDate.trim()) {
            setUploadError('Completion date is required');
            return;
        }

        if (!uploadForm.description.trim()) {
            setUploadError('Description is required');
            return;
        }

        if (!uploadForm.file && !editId) {
            setUploadError('Please upload a certificate file');
            return;
        }

        const formData = new FormData();
        formData.append('title', uploadForm.title.trim());
        formData.append('completion_date', uploadForm.completionDate.trim());
        formData.append('description', uploadForm.description.trim());
        if (uploadForm.file) formData.append('file', uploadForm.file);

        if (editId && uploadForm.file && !window.confirm('Replace the existing certificate with the new upload?')) return;

        setIsUploading(true);
        try {
            const saved = editId
                ? await updateCertificate(editId, formData)
                : await uploadCertificate(formData);

            const normalized = normalizeCertificate(saved);

            setCertificates((prev) => (
                editId
                    ? prev.map((cert) => (cert.id === editId ? normalized : cert))
                    : [normalized, ...prev]
            ));
            resetUploadForm();
        } catch (error) {
            setUploadError(getUploadErrorMessage(error));
        } finally {
            setIsUploading(false);
        }
    };

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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        My <span className="gradient-text">Certificates</span>
                    </h1>
                    <p className="text-gray-400">Browse, verify, and share every achievement in the same visual style as your upcoming hackathons feed.</p>
                </div>
                <button
                    type="button"
                    onClick={openUploadModal}
                    className="self-start rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-blue-500"
                >
                    + Upload Certificate
                </button>
            </div>

            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
                    <form onSubmit={handleSubmitUpload} className="w-full max-w-2xl rounded-2xl border border-white/10 bg-navy-950 p-6 shadow-2xl md:p-8">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{editId ? 'Edit Certificate' : 'Upload Certificate'}</h2>
                                <p className="mt-1 text-sm text-gray-400">Upload jpg, png, webp, or pdf. Title is required.</p>
                            </div>
                            <button
                                type="button"
                                onClick={resetUploadForm}
                                className="rounded-full px-3 py-1 text-2xl leading-none text-gray-400 transition hover:bg-white/10 hover:text-white"
                                aria-label="Close upload modal"
                            >
                                x
                            </button>
                        </div>

                        {uploadError && (
                            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {uploadError}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-200">Certificate Title *</label>
                                <input
                                    name="title"
                                    value={uploadForm.title}
                                    onChange={handleUploadChange}
                                    placeholder="e.g., AWS Certified Cloud Practitioner"
                                    className="w-full rounded-xl border border-white/10 bg-navy-900/80 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/60"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-200">Date of Completion *</label>
                                <input
                                    type="date"
                                    name="completionDate"
                                    value={uploadForm.completionDate}
                                    onChange={handleUploadChange}
                                    className="w-full rounded-xl border border-white/10 bg-navy-900/80 px-4 py-3 text-white focus:outline-none focus:border-purple-500/60"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-200">Description *</label>
                                <textarea
                                    name="description"
                                    value={uploadForm.description}
                                    onChange={handleUploadChange}
                                    placeholder="Describe the competencies evaluated..."
                                    rows="4"
                                    className="w-full rounded-xl border border-white/10 bg-navy-900/80 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/60"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-200">Upload File {editId ? '' : '*'}</label>
                                <input
                                    type="file"
                                    name="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    onChange={handleUploadChange}
                                    className="w-full rounded-xl border border-white/10 bg-navy-900/80 px-4 py-3 text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/20"
                                    required={!editId}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetUploadForm}
                                className="rounded-xl bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white transition hover:from-purple-500 hover:to-blue-500 disabled:opacity-60"
                            >
                                {isUploading ? 'Saving...' : editId ? 'Update' : 'Upload'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass rounded-2xl border border-white/5 p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Credentials</p>
                    <p className="text-3xl font-bold text-white">{stats.total.toString().padStart(2, '0')}</p>
                </div>
                <div className="glass rounded-2xl border border-white/5 p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verified Records</p>
                    <p className="text-3xl font-bold text-emerald-400">{stats.verified.toString().padStart(2, '0')}</p>
                </div>
                <div className="glass rounded-2xl border border-white/5 p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Review</p>
                    <p className="text-3xl font-bold text-amber-400">{stats.pending.toString().padStart(2, '0')}</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                <div className="xl:w-3/5 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h2 className="text-xl font-bold text-white">Achievement Collection</h2>
                        <div className="w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Search by title, issuer, or ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-500"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="glass rounded-2xl border border-white/5 h-[360px] animate-pulse bg-navy-900/40" />
                            ))}
                        </div>
                    ) : filteredCertificates.length === 0 ? (
                        <div className="glass rounded-2xl border border-white/5 p-10 text-center">
                            <h3 className="text-xl font-bold text-white mb-2">No certificates found</h3>
                            <p className="text-gray-400">Try a different keyword to search your credentials.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredCertificates.map((cert) => (
                                <div
                                    key={cert.id}
                                    className="glass rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all duration-300 group flex flex-col overflow-hidden"
                                >
                                    <div className="h-40 relative overflow-hidden">
                                        <img
                                            src={cert.image}
                                            alt={cert.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/30 to-transparent" />
                                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase">
                                            {cert.category}
                                        </div>
                                        <div className="absolute bottom-4 left-6">
                                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{cert.issuer}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2 gap-3">
                                            <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                                                {cert.title}
                                            </h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                                                cert.status === 'Verified'
                                                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                                    : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                            }`}>
                                                {cert.status}
                                            </span>
                                        </div>

                                        <p className="text-gray-400 text-sm mb-6">
                                            Credential ID: <span className="font-mono text-gray-300">{cert.id}</span>
                                        </p>

                                        <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400">Issued</span>
                                                <span className="text-white font-semibold">{cert.date}</span>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setCertId(cert.id)}
                                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/5 transition-colors"
                                                >
                                                    Use for Verify
                                                </button>
                                                <button
                                                    onClick={() => handleEditCertificate(cert)}
                                                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCertificate(cert.id)}
                                                    className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors"
                                                >
                                                    Delete
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
                    <div className="glass p-8 rounded-2xl border border-purple-500/20 shadow-xl relative overflow-hidden xl:sticky xl:top-24">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -z-10"></div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Credential Center</h3>
                                <p className="text-sm text-gray-400 italic">Verify a certificate from your achievement history.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleShareTranscript}
                                    disabled={isSharing}
                                    className="py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors disabled:opacity-50"
                                >
                                    {isSharing ? 'Sharing...' : 'Share Transcript'}
                                </button>
                                <button
                                    onClick={handleDownloadAll}
                                    disabled={isDownloadingAll}
                                    className="py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isDownloadingAll ? 'Preparing...' : 'Download All'}
                                </button>
                            </div>

                            <div className="glass p-6 rounded-2xl border border-white/5">
                                <h4 className="text-lg font-bold text-white mb-4">Certificate Verification</h4>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={certId}
                                        onChange={(e) => setCertId(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                        placeholder="e.g., PE-2024-NX8829-VZ"
                                        className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-500 font-mono text-sm uppercase"
                                    />

                                    <button
                                        onClick={handleVerify}
                                        disabled={isVerifying || !certId.trim()}
                                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {isVerifying ? 'Verifying...' : 'Verify Certificate'}
                                    </button>
                                </div>

                                {verifiedResult && (
                                    <div className={`mt-5 rounded-2xl border p-5 ${
                                        verifiedResult.status === 'success'
                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                            : 'bg-red-500/10 border-red-500/20'
                                    }`}>
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${
                                            verifiedResult.status === 'success' ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {verifiedResult.status === 'success' ? 'Authentic Record' : 'Invalid ID'}
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-gray-400">Recipient</span>
                                                <span className="text-white font-semibold text-right">{verifiedResult.recipient}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-gray-400">Event</span>
                                                <span className="text-white font-semibold text-right">{verifiedResult.event}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-gray-400">Issued</span>
                                                <span className="text-white font-semibold text-right">{verifiedResult.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="glass p-6 rounded-2xl border border-white/5">
                                <h4 className="text-lg font-bold text-white mb-3">Achievement Notes</h4>
                                <div className="space-y-3 text-sm text-gray-400">
                                    <p>Verified certificates are ready for transcript sharing and portfolio downloads.</p>
                                    <p>Pending credentials remain visible here so you can track new awards in one place.</p>
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

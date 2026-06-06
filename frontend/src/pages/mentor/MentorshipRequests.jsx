import React, { useState, useEffect, useMemo } from 'react';
import { fetchMentorshipRequests, updateMentorshipRequestStatus } from '../../services/mentor/mentorshipRequestsApi';

const MentorshipRequests = () => {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('mentorshipActiveTab') || 'Pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequestId, setSelectedRequestId] = useState(() => {
        const stored = sessionStorage.getItem('mentorshipSelectedId');
        return stored || null;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Local state for requests
    const [requestsList, setRequestsList] = useState([]);

    // --- INITIAL DATA FETCH ---
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const data = await fetchMentorshipRequests();
                setRequestsList(data);

                // Auto-select logic
                if (!sessionStorage.getItem('mentorshipSelectedId')) {
                    const firstPending = data.find(r => r.status === 'Pending');
                    if (firstPending) setSelectedRequestId(firstPending.id);
                }
            } catch (error) {
                console.error("Failed to fetch mentorship requests:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequests();
    }, []);

    // --- PERSISTENCE ---
    useEffect(() => {
        sessionStorage.setItem('mentorshipActiveTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (selectedRequestId) sessionStorage.setItem('mentorshipSelectedId', selectedRequestId.toString());
    }, [selectedRequestId]);

    // --- LOGIC ---
    const filteredRequests = useMemo(() => {
        return requestsList.filter(req => {
            const matchesTab = activeTab === 'All' ? true : req.status === activeTab;
            const matchesSearch = req.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                req.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
                req.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [requestsList, activeTab, searchQuery]);

    const selectedRequest = requestsList.find(r => r.id === selectedRequestId);

    const handleAction = async (requestId, actionType) => {
        try {
            await updateMentorshipRequestStatus(requestId, actionType);

            setRequestsList(prev => prev.map(req => {
                if (req.id === requestId) {
                    return { ...req, status: actionType === 'accept' ? 'Assigned' : 'Archived' };
                }
                return req;
            }));
        } catch (error) {
            console.error("Failed to update request status:", error);
        } finally {
            setIsSubmitting(false);
        }

        // Move selection if in pending view
        if (activeTab === 'Pending') {
            const remaining = filteredRequests.filter(r => r.id !== requestId && r.status === 'Pending');
            if (remaining.length > 0) setSelectedRequestId(remaining[0].id);
            else setSelectedRequestId(null);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-6 flex-none">
                <h1 className="text-3xl font-bold text-white">
                    Mentorship Requests
                </h1>
                <p className="text-gray-400 mt-2">Review and manage incoming mentorship applications.</p>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">

                {/* Left Panel - List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 glass border border-white/10 rounded-2xl p-4 overflow-hidden">
                    {/* Search & Tabs */}
                    <div className="flex-none space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search requests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="flex p-1 bg-navy-900/50 rounded-xl border border-white/5">
                            {['All', 'Pending', 'Archived'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                                        ? 'bg-white/10 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/5 animate-pulse">
                                    <div className="h-4 w-2/3 bg-white/10 rounded mb-2"></div>
                                    <div className="h-3 w-full bg-white/5 rounded"></div>
                                </div>
                            ))
                        ) : filteredRequests.map(req => (
                            <div
                                key={req.id}
                                onClick={() => setSelectedRequestId(req.id)}
                                className={`
                                    p-4 rounded-xl border cursor-pointer transition-all duration-300
                                    ${selectedRequestId === req.id
                                        ? 'bg-purple-600/10 border-purple-500/50 shadow-lg shadow-purple-500/10'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold ${selectedRequestId === req.id ? 'text-white' : 'text-gray-200'}`}>
                                        {req.teamName}
                                    </h3>
                                    <span className="text-xs text-gray-500">{req.requestDate}</span>
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                                    {req.description}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-purple-300 border border-purple-500/20">
                                        {req.domain}
                                    </span>
                                    {req.status !== 'Pending' && (
                                        <span className={`text-xs font-bold uppercase tracking-wider ${req.status === 'Assigned' ? 'text-green-400' : 'text-gray-500'}`}>
                                            {req.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!isLoading && filteredRequests.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                No requests found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Details */}
                <div className="flex-1 glass-strong border border-white/10 rounded-2xl p-6 lg:p-8 overflow-y-auto relative">
                    {selectedRequest ? (
                        <div className="space-y-8">
                            {/* Header Info */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-purple-600/20 flex items-center justify-center text-2xl font-bold text-purple-400 border border-purple-500/30">
                                        {selectedRequest.teamName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{selectedRequest.teamName}</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-purple-400 font-medium">{selectedRequest.domain}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                                            <span className="text-gray-400 text-sm">Applied on {selectedRequest.appliedDate}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {selectedRequest.status === 'Pending' ? (
                                        <>
                                            <button
                                                disabled={isSubmitting}
                                                onClick={() => handleAction(selectedRequest.id, 'reject')}
                                                className="flex-1 md:flex-none bg-white/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-transparent hover:border-red-500/30 px-6 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 pointer-events-auto"
                                            >
                                                {isSubmitting ? '...' : 'Reject'}
                                            </button>
                                            <button
                                                disabled={isSubmitting}
                                                onClick={() => handleAction(selectedRequest.id, 'accept')}
                                                className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 px-8 py-2.5 rounded-xl font-semibold transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                                            >
                                                {isSubmitting ? 'Finalizing...' : 'Accept Request'}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm font-semibold">
                                            Request {selectedRequest.status}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Key Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-navy-900/40 border border-white/5 rounded-xl p-4">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Duration</p>
                                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        {selectedRequest.duration}
                                    </p>
                                </div>
                                <div className="bg-navy-900/40 border border-white/5 rounded-xl p-4">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Frequency</p>
                                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        {selectedRequest.frequency}
                                    </p>
                                </div>
                                <div className="bg-navy-900/40 border border-white/5 rounded-xl p-4">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Focus Area</p>
                                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        {selectedRequest.focusArea}
                                    </p>
                                </div>
                            </div>

                            {/* Message */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                    Mentorship Requirement
                                </h3>
                                <p className="text-gray-300 leading-relaxed">
                                    "{selectedRequest.message}"
                                </p>
                            </div>

                            {/* Team Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Team Overview</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400">Stage</span>
                                            <span className="text-white font-medium bg-white/10 px-3 py-1 rounded-lg">{selectedRequest.stage}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400">Location</span>
                                            <span className="text-white font-medium">{selectedRequest.location}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400">Team Size</span>
                                            <span className="text-white font-medium">{selectedRequest.teamSize} Members</span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-gray-400 mb-3">Founding Team</p>
                                        <div className="flex gap-2">
                                            {selectedRequest.members.map((member, idx) => (
                                                <div key={idx} className="group relative">
                                                    <div className={`w-10 h-10 rounded-full ${member.avatarColor} flex items-center justify-center text-white font-bold border-2 border-navy-900 cursor-help`}>
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                        {member.name}
                                                    </div>
                                                </div>
                                            ))}
                                            <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-dashed border-gray-600 flex items-center justify-center text-gray-400 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resources */}
                            <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                                <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-2 px-4 py-2 bg-navy-900/50 hover:bg-white/5 border border-white/10 rounded-lg text-sm text-blue-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    Visit Website
                                </a>
                                <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-2 px-4 py-2 bg-navy-900/50 hover:bg-white/5 border border-white/10 rounded-lg text-sm text-red-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    Pitch Deck (PDF)
                                </a>
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <div className="bg-white/5 p-4 rounded-full mb-4">
                                <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            </div>
                            <p className="text-lg font-medium">Select a request to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentorshipRequests;

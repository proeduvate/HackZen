import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    fetchHackathonChangeRequest, 
    sendReminderNotification, 
    markAsResolved, 
    withdrawRequestAndReject,
    fetchHackathonSubmissionDetails,
    sendMessageToOrganizer
} from '../../services/admin/hackathonApprovalsApi';

const HackathonChangeRequest = () => {
    const navigate = useNavigate();
    const [requestData, setRequestData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [submissionData, setSubmissionData] = useState(null);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [messageSending, setMessageSending] = useState(false);
    const [messageError, setMessageError] = useState('');

    useEffect(() => {
        const loadRequests = async () => {
            setIsLoading(true);
            try {
                const data = await fetchHackathonChangeRequest();
                setRequestData(data);
            } catch (error) {
                console.error("Failed to fetch request data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadRequests();
    }, []);

    const handleAction = async (actionFn, actionName) => {
        setActionLoading(actionName);
        try {
            await actionFn();
            const newData = await fetchHackathonChangeRequest();
            setRequestData(newData);
            if (actionName === 'reject') {
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReminder = async () => {
        setActionLoading('reminder');
        try {
            await sendReminderNotification();
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewSubmission = async () => {
        try {
            const data = await fetchHackathonSubmissionDetails();
            setSubmissionData(data);
            setShowSubmissionModal(true);
        } catch (error) {
            console.error('Failed to fetch submission details:', error);
        }
    };

    const handleOpenMessageModal = () => {
        setMessageContent('');
        setMessageError('');
        setShowMessageModal(true);
    };

    const handleSendMessage = async () => {
        if (!messageContent.trim()) {
            setMessageError('Please enter a message.');
            return;
        }

        setMessageSending(true);
        try {
            const result = await sendMessageToOrganizer(messageContent);
            if (result.success) {
                setShowMessageModal(false);
                setMessageContent('');
                setMessageError('');
            } else {
                setMessageError(result.message);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessageError('Failed to send message. Please try again.');
        } finally {
            setMessageSending(false);
        }
    };

    if (isLoading || !requestData) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Main Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-white tracking-tight">{requestData.title}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest \${
                            requestData.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            requestData.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                        }`}>
                            {requestData.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <img src={requestData.organizerAvatar} className="w-5 h-5 rounded-full" alt="" />
                            <span className="font-medium text-gray-300">{requestData.organizerName}</span>
                        </div>
                        <span className="text-gray-600">•</span>
                        <span>Submitted on {requestData.submittedOn}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleViewSubmission} className="px-6 py-2.5 glass rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-all border-white/10 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        View Submission
                    </button>
                    <button onClick={handleOpenMessageModal} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                        Message Organizer
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Requested Changes */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-strong rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-8 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-amber-500/10">
                                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </span>
                                Requested Changes
                            </h2>
                            <span className="text-xs text-gray-500 font-medium tracking-wide bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                3 Total Items
                            </span>
                        </div>

                        <div className="p-0">
                            {requestData.changeItems.map((item, index) => (
                                <div key={item.id} className={`p-8 flex items-start gap-6 hover:bg-white/[0.02] transition-all border-b border-white/5 last:border-0 group`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-all ${item.status === 'Resolved' ? 'bg-emerald-500/10' : 'bg-orange-500/10 group-hover:scale-110'}`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                                                {index + 1}. {item.title}
                                            </h3>
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                                {item.status === 'Resolved' && (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                )}
                                                {item.status}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-400 leading-relaxed font-light">
                                            {item.description}
                                        </p>
                                        <div className="flex items-center gap-3 pt-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Action Required:</span>
                                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-300 font-bold tracking-tight">
                                                {item.actionRequired}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
                            <button 
                                onClick={handleReminder}
                                disabled={actionLoading === 'reminder' || requestData.status !== 'Changes Requested'}
                                className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-sm font-bold rounded-xl border border-amber-500/20 transition-all">
                                {actionLoading === 'reminder' ? 'Sending...' : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                        Send Reminder Notification
                                    </>
                                )}
                            </button>
                            <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Last updated by {requestData.lastUpdatedBy.toLowerCase()} {requestData.lastUpdated}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Timeline & Actions */}
                <div className="space-y-6">
                    {/* Activity Timeline Card */}
                    <div className="glass-strong rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Activity Timeline
                            </h2>
                        </div>
                        <div className="p-8 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[45px] top-10 bottom-10 w-px bg-white/10"></div>

                            <div className="space-y-8 relative">
                                {requestData.timeline.map((event) => (
                                    <div key={event.id} className="flex items-start gap-4">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 \${event.isActive ? (event.status === 'Rejected' ? 'bg-red-500/20 border border-red-500/50' : 'bg-blue-500/20 border border-blue-500/50') : 'bg-white/5 border border-white/10'}`}>
                                            <div className={`w-2 h-2 rounded-full \${event.isActive ? (event.status === 'Rejected' ? 'bg-red-500' : 'bg-blue-500') : 'bg-gray-600'}`}></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold uppercase tracking-tight \${event.isActive ? 'text-white' : 'text-gray-300 text-opacity-50'}`}>{event.status}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{event.timestamp}</p>
                                            {event.actor && (
                                                <p className={`text-[10px] font-bold uppercase mt-1 \${event.isActive ? (event.status === 'Rejected' ? 'text-red-400' : 'text-blue-400') : 'text-gray-600'}`}>
                                                    {event.actor}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Admin Actions Card */}
                    <div className="glass-strong rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                Admin Actions
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-4">
                                <button 
                                    onClick={() => handleAction(markAsResolved, 'resolve')}
                                    disabled={actionLoading !== null || requestData.status !== 'Changes Requested'}
                                    className="disabled:opacity-50 disabled:cursor-not-allowed w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2">
                                    {actionLoading === 'resolve' ? 'Processing...' : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                            Mark as Resolved
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-500 text-center px-4">Confirms all requested changes are met and advances to final approval.</p>
                            </div>

                            <div className="h-px bg-white/5 my-2"></div>

                            <div className="space-y-4">
                                <button 
                                    onClick={() => handleAction(withdrawRequestAndReject, 'reject')}
                                    disabled={actionLoading !== null || requestData.status !== 'Changes Requested'}
                                    className="disabled:opacity-50 disabled:cursor-not-allowed w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl text-sm font-bold border border-red-500/20 transition-all flex items-center justify-center gap-2">
                                    {actionLoading === 'reject' ? 'Withdrawing...' : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            Withdraw Request & Reject
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-500 text-center px-4">Cancels the change request and issues an immediate rejection of the submission.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submission Details Modal */}
            {showSubmissionModal && submissionData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-950">
                            <h2 className="text-2xl font-bold text-white">{submissionData.title}</h2>
                            <button onClick={() => setShowSubmissionModal(false)} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4">
                                <img src={submissionData.organizerAvatar} alt="" className="w-12 h-12 rounded-xl border border-white/10" />
                                <div>
                                    <p className="font-semibold text-white">{submissionData.organizerName}</p>
                                    <p className="text-sm text-gray-400">Submitted on {submissionData.submittedOn}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                                <p className="text-gray-300 leading-relaxed">{submissionData.description}</p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Event Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Start Date</p>
                                        <p className="text-white font-semibold">{submissionData.details.startDate}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">End Date</p>
                                        <p className="text-white font-semibold">{submissionData.details.endDate}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Expected Participants</p>
                                        <p className="text-white font-semibold">{submissionData.details.expectedParticipants}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Prize Pool</p>
                                        <p className="text-white font-semibold">{submissionData.details.prizePool}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Documents</h3>
                                <div className="space-y-2">
                                    {submissionData.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                            <div>
                                                <p className="font-semibold text-white">{doc.type}</p>
                                                <p className="text-xs text-gray-400">{doc.name} • {doc.size}</p>
                                            </div>
                                            <p className="text-xs text-gray-500">{doc.uploaded}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Organizer Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-white/10 rounded-3xl max-w-xl w-full">
                        <div className="p-8 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Message {requestData.organizerName}</h2>
                            <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Message</label>
                                <textarea
                                    value={messageContent}
                                    onChange={(e) => {
                                        setMessageContent(e.target.value);
                                        setMessageError('');
                                    }}
                                    placeholder="Enter your message to the organizer..."
                                    className="w-full h-32 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-gray-500 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                            {messageError && (
                                <p className="text-sm text-rose-400">{messageError}</p>
                            )}
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowMessageModal(false)}
                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold transition-all border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={messageSending || !messageContent.trim()}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {messageSending ? 'Sending...' : 'Send Message'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HackathonChangeRequest;

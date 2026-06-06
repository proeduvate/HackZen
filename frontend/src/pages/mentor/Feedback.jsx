import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchStudents, markStudentActivityViewed, submitFeedback } from '../../services/mentor/feedbackApi';

const Feedback = () => {
    // --- STATE MANAGEMENT ---
    const [selectedStudentId, setSelectedStudentId] = useState(() => {
        const stored = sessionStorage.getItem('selectedStudentId');
        return stored || null;
    });
    const [searchTerm, setSearchTerm] = useState(() => {
        return sessionStorage.getItem('feedbackSearchTerm') || '';
    });
    const [feedbackType, setFeedbackType] = useState('Code Quality');
    const [rating, setRating] = useState('Good');
    const [feedbackText, setFeedbackText] = useState(() => {
        return sessionStorage.getItem('feedbackDraft') || '';
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [studentsList, setStudentsList] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
    const [submissionError, setSubmissionError] = useState(null);
    const listRef = useRef(null);

    // --- INITIAL DATA FETCH (MOCKED) ---
    useEffect(() => {
        const loadStudents = async () => {
            setIsLoading(true);
            try {
                const data = await fetchStudents();
                setStudentsList(data);
                if (data.length > 0 && !selectedStudentId) {
                    setSelectedStudentId(data[0].id);
                }
            } catch (err) {
                console.error("Failed to load students:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadStudents();
    }, []);

    // --- PERSISTENCE ---
    useEffect(() => {
        if (selectedStudentId) {
            sessionStorage.setItem('selectedStudentId', selectedStudentId.toString());
        }
        // Reset activity for the selected student
        const resetActivity = async () => {
            setStudentsList(prev => prev.map(s => s.id === selectedStudentId ? { ...s, hasNewActivity: false } : s));
            try {
                await markStudentActivityViewed(selectedStudentId);
            } catch (error) {
                console.error("Failed to update student activity status:", error);
            }
        };
        resetActivity();
    }, [selectedStudentId]);

    useEffect(() => {
        sessionStorage.setItem('feedbackDraft', feedbackText);
    }, [feedbackText]);

    useEffect(() => {
        sessionStorage.setItem('feedbackSearchTerm', searchTerm);
    }, [searchTerm]);

    // Scroll persistence
    useEffect(() => {
        if (!isLoading && listRef.current) {
            const savedScroll = sessionStorage.getItem('feedbackListScroll');
            if (savedScroll) listRef.current.scrollTop = parseInt(savedScroll);
        }
    }, [isLoading]);

    const handleScroll = (e) => {
        sessionStorage.setItem('feedbackListScroll', e.target.scrollTop.toString());
    };

    // --- LOGIC ---
    const filteredStudents = useMemo(() => {
        return studentsList.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.team.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [studentsList, searchTerm]);

    const selectedStudent = useMemo(() => {
        return studentsList.find(s => s.id === selectedStudentId);
    }, [studentsList, selectedStudentId]);

    const isFormValid = feedbackText.trim().length >= 10;

    // --- HANDLERS ---
    const handleSaveDraft = () => {
        setSaveStatus('saving');
        sessionStorage.setItem('feedbackDraft', feedbackText);
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 2000);
        }, 500);
    };

    const handleSendFeedback = async () => {
        if (!isFormValid || !selectedStudentId) return;

        setIsSubmitting(true);
        setSubmissionError(null);

        try {
            const newEntry = await submitFeedback(selectedStudentId, {
                type: feedbackType,
                message: feedbackText,
                rating: rating
            });

            setStudentsList(prev => prev.map(student => {
                if (student.id === selectedStudentId) {
                    return {
                        ...student,
                        recentFeedback: [newEntry, ...student.recentFeedback]
                    };
                }
                return student;
            }));

            setFeedbackText('');
            setFeedbackType('Code Quality');
            setRating('Good');
            sessionStorage.removeItem('feedbackDraft');
        } catch (err) {
            setSubmissionError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-[calc(100vh-140px)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium animate-pulse">Synchronizing Student Networks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 flex-none">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                        Feedback Management
                    </h1>
                    <p className="text-gray-400 mt-2">Review and provide feedback to student teams.</p>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                {/* Left Panel - Student List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 glass border border-white/10 rounded-2xl p-4 overflow-hidden">
                    <div className="flex-none space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>

                    <div
                        ref={listRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
                    >
                        {filteredStudents.map(student => (
                            <div
                                key={student.id}
                                role="button"
                                tabIndex="0"
                                onClick={() => setSelectedStudentId(student.id)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedStudentId(student.id)}
                                className={`
                                    p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-300 outline-none border active:scale-95 group
                                    ${selectedStudentId === student.id
                                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                        : 'hover:bg-white/5 border-transparent focus-visible:bg-white/5'}
                                `}
                            >
                                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold shadow-xl border border-white/10 transition-transform group-hover:scale-110 bg-navy-950/80`}>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${student.avatarColor} opacity-20`}></div>
                                    <span className="relative z-10">{student.name.charAt(0)}</span>
                                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-4 border-navy-900 rounded-full shadow-lg ${student.status === 'online' ? 'bg-emerald-500' :
                                        student.status === 'idle' ? 'bg-amber-500' : 'bg-gray-600'
                                        }`}></span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold truncate transition-colors ${selectedStudentId === student.id ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>{student.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-gray-500 truncate">{student.team}</p>
                                        {student.hasNewActivity && (
                                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredStudents.length === 0 && (
                            <div className="p-10 text-center text-gray-500">
                                No students found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Feedback Form */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden min-h-0 pr-1">
                    {/* Header Info */}
                    {selectedStudent ? (
                        <div className="flex items-center gap-4 glass border border-white/10 rounded-xl p-6">
                            <div className={`w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-lg font-semibold text-white`}>
                                <div className={`absolute inset-0 bg-gradient-to-br ${selectedStudent.avatarColor} opacity-20`}></div>
                                <span className="relative z-10">{selectedStudent.name.charAt(0)}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedStudent.name}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-purple-400 font-medium">{selectedStudent.role}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                                    <span className="text-gray-400 text-sm">{selectedStudent.team}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center glass border border-white/10 rounded-xl p-6 h-24">
                            <p className="text-gray-400">Select a student to provide feedback.</p>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto pr-3 custom-scrollbar pb-10">
                        {/* New Feedback Entry Form */}
                        <div className="glass-strong border border-white/10 rounded-2xl p-6 lg:p-8 relative">
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    Submit Feedback
                                </h3>
                                {saveStatus && (
                                    <span className={`text-sm font-medium px-3 py-1 rounded-md ${saveStatus === 'saved' ? 'text-green-400 bg-green-400/10' : 'text-purple-400 bg-purple-400/10'
                                        }`}>
                                        {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Feedback Type</label>
                                    <div className="relative">
                                        <select
                                            value={feedbackType}
                                            onChange={(e) => setFeedbackType(e.target.value)}
                                            className="w-full appearance-none bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                        >
                                            <option>Code Quality</option>
                                            <option>Communication</option>
                                            <option>Teamwork</option>
                                            <option>UI/UX Design</option>
                                            <option>Presentation</option>
                                            <option>Problem Solving</option>
                                        </select>
                                        <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Rating</label>
                                    <div className="relative">
                                        <select
                                            value={rating}
                                            onChange={(e) => setRating(e.target.value)}
                                            className="w-full appearance-none bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                        >
                                            <option>Excellent</option>
                                            <option>Good</option>
                                            <option>Average</option>
                                            <option>Needs Improvement</option>
                                        </select>
                                        <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 relative z-10">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-400">Message</label>
                                    <span className={`text-xs ${feedbackText.length > 450 ? 'text-red-400' : 'text-gray-500'}`}>
                                        {feedbackText.length} / 500
                                    </span>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))}
                                        placeholder="Enter your feedback here..."
                                        className={`w-full h-32 bg-navy-900/50 border rounded-xl p-4 text-white focus:outline-none transition-colors resize-none placeholder-gray-500 ${submissionError ? 'border-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-purple-500/50'
                                            }`}
                                    ></textarea>
                                </div>
                                <div className="flex justify-between items-start mt-2 h-4">
                                    {!isFormValid && feedbackText.trim().length > 0 ? (
                                        <p className="text-xs text-amber-500/70">Minimum 10 characters required.</p>
                                    ) : (
                                        <span></span>
                                    )}
                                    {submissionError && (
                                        <p className="text-sm text-red-400 font-medium flex items-center gap-2">
                                            {submissionError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 relative z-10">
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={isSubmitting || !feedbackText.trim()}
                                    className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 font-semibold transition-all disabled:opacity-50 pointer-events-auto"
                                >
                                    Save Draft
                                </button>
                                <button
                                    onClick={handleSendFeedback}
                                    disabled={isSubmitting || !feedbackText.trim()}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 px-8 py-2.5 rounded-xl font-semibold transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </div>

                        {/* Recent Feedback Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white mb-4">Previous Feedback</h3>
                            {selectedStudent && selectedStudent.recentFeedback.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedStudent.recentFeedback.map((fb, idx) => (
                                        <div key={fb.id} className="bg-navy-900/40 border border-white/5 rounded-xl p-4 transition-all duration-300 hover:bg-white/5">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-purple-300 border border-purple-500/20">
                                                        {fb.type}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase ${fb.rating === 'Excellent' ? 'text-green-400' :
                                                        fb.rating === 'Needs Improvement' ? 'text-red-400' :
                                                            'text-purple-400'
                                                        }`}>
                                                        {fb.rating}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500">{fb.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 leading-relaxed">
                                                "{fb.message}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                                    No previous feedback found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

};

export default Feedback;

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAllHackathons } from '../../api/hackathonApi';

const StudentHackathons = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [selectedHackathon, setSelectedHackathon] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Track registered hackathons in state and sync with sessionStorage
    const [registeredIds, setRegisteredIds] = useState(() => {
        const saved = sessionStorage.getItem('registeredHackathons');
        return saved ? JSON.parse(saved) : [];
    });

    const [hackathons, setHackathons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial load
    useEffect(() => {
        const loadHackathons = async () => {
            setIsLoading(true);
            try {
                const data = await fetchAllHackathons();
                // Map API data to UI format
                const formattedData = data.map(h => ({
                    id: h.id,
                    title: h.title,
                    organizer: h.organizer_name || 'ProEduvate Partner',
                    description: h.description,
                    tags: h.themes || [],
                    date: new Date(h.hackathonStart).toLocaleDateString(),
                    duration: '48 Hours', // Mocked duration
                    participants: h.participants_count || '0',
                    mode: h.location || 'Virtual',
                    status: h.status || 'Open',
                    teamSizeLimit: h.maxTeamSize || 4,
                    image: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700', // Default image
                    themes: h.themes || []
                }));
                setHackathons(formattedData);
            } catch (error) {
                console.error("Failed to fetch arenas:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadHackathons();
    }, []);

    const handleHackathonClick = (hackathon) => {
        setSelectedHackathon(hackathon);
    };

    const handleBackToList = () => {
        setSelectedHackathon(null);
    };

    useEffect(() => {
        if (location.state && location.state.hackathonId) {
            const hackathon = hackathons.find(h => h.id === location.state.hackathonId);
            if (hackathon) {
                setSelectedHackathon(hackathon);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, hackathons]);

    useEffect(() => {
        if (location.state?.registrationComplete) {
            setShowSuccessModal(true);
            const timer = setTimeout(() => {
                setShowSuccessModal(false);
                window.history.replaceState({}, document.title);
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [location.state]);

    const isRegistered = (id) => registeredIds.includes(id);

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Success Modal - Consistent Glass Design */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass p-6 max-w-sm w-full text-center border border-blue-500/30 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.2)] animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Registration Success!</h3>
                        <p className="text-[10px] text-gray-400 mb-4">Your team is now registered for {selectedHackathon?.title}.</p>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-500 animate-[progress_2.5s_linear_forwards] origin-left"></div>
                        </div>
                    </div>
                </div>
            )}

            {selectedHackathon ? (
                // --- DETAIL VIEW ---
                <div className="flex flex-col max-w-5xl w-full mx-auto flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                    <button onClick={handleBackToList} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-4 transition-colors w-fit group">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        <span className="text-[10px] font-medium uppercase tracking-wider">Back to Arenas</span>
                    </button>

                    <div className="flex flex-col xl:flex-row gap-4">
                        {/* Left Column */}
                        <div className="xl:w-3/5 space-y-4">
                            <div className={`h-40 sm:h-48 rounded-xl ${selectedHackathon.image} relative overflow-hidden glass border border-white/10`}>
                                <div className="absolute inset-0 bg-black/20"></div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20 text-white mb-2">
                                        {selectedHackathon.mode}
                                    </span>
                                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">{selectedHackathon.title}</h1>
                                    <p className="text-[9px] text-white/70">Organized by {selectedHackathon.organizer}</p>
                                </div>
                            </div>

                            <div className="glass p-4 rounded-xl border border-white/5 shadow-sm">
                                <h2 className="text-sm font-bold text-white mb-2">About the Challenge</h2>
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    {selectedHackathon.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="glass p-3 rounded-xl border border-white/5 shadow-sm">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Schedule</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-300">Begins</span>
                                        <span className="text-[10px] font-bold text-white">{selectedHackathon.date}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1.5">
                                        <span className="text-[10px] text-gray-300">Duration</span>
                                        <span className="text-[10px] font-bold text-white">{selectedHackathon.duration}</span>
                                    </div>
                                </div>
                                <div className="glass p-3 rounded-xl border border-white/5 shadow-sm">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Configuration</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-300">Max Team</span>
                                        <span className="text-[10px] font-bold text-white">{selectedHackathon.teamSizeLimit} Members</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1.5">
                                        <span className="text-[10px] text-gray-300">Mode</span>
                                        <span className="text-[10px] font-bold text-white">{selectedHackathon.mode}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Registration Form (Integrated Design) */}
                        <div className="xl:w-2/5">
                            <div className="glass p-4 sm:p-5 rounded-xl border border-blue-500/20 shadow-md relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl -z-10"></div>

                                {isRegistered(selectedHackathon.id) ? (
                                    <div className="text-center py-6">
                                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-green-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-1">Already Registered</h3>
                                        <p className="text-[10px] text-gray-400 mb-6">You have secured your spot. Check your dashboard for tracking.</p>
                                        <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg border border-white/10 transition-colors">
                                            Go to Dashboard
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 py-2">
                                        <div>
                                            <h3 className="text-base font-bold text-white mb-1">Registration</h3>
                                            <p className="text-[9px] text-gray-400 italic">Continue to a dedicated multi-step registration flow built for team creation and final submission.</p>
                                        </div>
                                        <div className="space-y-3 pt-2">
                                            <button
                                                onClick={() => navigate(`/student/hackathons/${selectedHackathon.id}/register`)}
                                                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg font-bold text-[10px] text-white shadow-md shadow-blue-600/20 hover:shadow-blue-600/40 transition-all hover:-translate-y-0.5"
                                            >
                                                Register Team
                                            </button>
                                            <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg border border-white/5 text-[10px] transition-colors">
                                                Download Brief
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- LIST VIEW ---
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1 pb-4">
                    {/* Consistent Dashboard Style Header */}
                    <div className="mb-4 flex-none">
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                            Explore <span className="gradient-text">Hackathons</span>
                        </h1>
                        <p className="text-[10px] text-gray-400">Join the most innovative challenges in the tech ecosystem.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 content-start">
                        {isLoading ? (
                            // Loading Skeletons
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="glass rounded-xl border border-white/5 h-48 animate-pulse bg-navy-900/40"></div>
                            ))
                        ) : (
                            hackathons.map((hackathon) => (
                                <div
                                    key={hackathon.id}
                                    onClick={() => handleHackathonClick(hackathon)}
                                    className="glass rounded-xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden shadow-sm"
                                >
                                    <div className={`h-24 ${hackathon.image} p-3 relative`}>
                                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-bold text-white uppercase">
                                            {hackathon.mode}
                                        </div>
                                        <div className="absolute bottom-2 left-3">
                                            <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest">{hackathon.organizer}</p>
                                        </div>
                                    </div>

                                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">{hackathon.title}</h3>
                                            {isRegistered(hackathon.id) && (
                                                <span className="text-[8px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 whitespace-nowrap ml-2">Registered</span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-[10px] line-clamp-2 mb-3 leading-snug">
                                            {hackathon.description}
                                        </p>

                                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                                <span className="text-[10px] text-gray-300 font-medium">{hackathon.participants}</span>
                                            </div>
                                            <button className="flex items-center gap-1 text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-wider">
                                                Select Arena
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentHackathons;

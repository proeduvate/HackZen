import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAllHackathons } from '../../api/hackathonApi';

const DEFAULT_HACKATHON_GRADIENT = 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700';

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
                    id: h.id || h._id,
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
                    image: h.posterUrl || DEFAULT_HACKATHON_GRADIENT,
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
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Success Modal - Consistent Glass Design */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass p-8 max-w-sm w-full text-center border border-purple-500/30 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Registration Success!</h3>
                        <p className="text-gray-400 mb-6">Your team is now registered for {selectedHackathon?.title}.</p>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-[progress_2.5s_linear_forwards] origin-left"></div>
                        </div>
                    </div>
                </div>
            )}

            {selectedHackathon ? (
                // --- DETAIL VIEW ---
                <div className="flex flex-col h-full max-w-6xl mx-auto">
                    <button onClick={handleBackToList} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors w-fit group">
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        <span className="font-medium">Back to Hackathons</span>
                    </button>

                    <div className="flex flex-col xl:flex-row gap-8">
                        {/* Left Column */}
                        <div className="xl:w-3/5 space-y-6">
                            <div className={`h-64 md:h-80 rounded-2xl ${selectedHackathon.image?.startsWith('http') ? '' : selectedHackathon.image} relative overflow-hidden glass border border-white/10`}>
                                {selectedHackathon.image?.startsWith('http') && (
                                    <img
                                        src={selectedHackathon.image}
                                        alt={`${selectedHackathon.title} poster`}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/20"></div>
                                <div className="absolute bottom-6 left-6 right-6">
                                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20 text-white mb-4">
                                        {selectedHackathon.mode}
                                    </span>
                                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{selectedHackathon.title}</h1>
                                    <p className="text-white/70">Organized by {selectedHackathon.organizer}</p>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-2xl border border-white/5">
                                <h2 className="text-xl font-bold text-white mb-4">About the Challenge</h2>
                                <p className="text-gray-400 leading-relaxed">
                                    {selectedHackathon.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="glass p-5 rounded-2xl border border-white/5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Schedule</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-300">Begins</span>
                                        <span className="text-sm font-bold text-white">{selectedHackathon.date}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-sm text-gray-300">Duration</span>
                                        <span className="text-sm font-bold text-white">{selectedHackathon.duration}</span>
                                    </div>
                                </div>
                                <div className="glass p-5 rounded-2xl border border-white/5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-300">Max Team</span>
                                        <span className="text-sm font-bold text-white">{selectedHackathon.teamSizeLimit} Members</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-sm text-gray-300">Mode</span>
                                        <span className="text-sm font-bold text-white">{selectedHackathon.mode}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Registration Form (Integrated Design) */}
                        <div className="xl:w-2/5">
                            <div className="glass p-8 rounded-2xl border border-purple-500/20 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -z-10"></div>

                                {isRegistered(selectedHackathon.id) ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Already Registered</h3>
                                        <p className="text-gray-400 mb-8">You have secured your spot. Check your dashboard for tracking.</p>
                                        <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-colors">
                                            Go to Dashboard
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 py-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Registration</h3>
                                            <p className="text-sm text-gray-400 italic">Continue to a dedicated multi-step registration flow built for team creation and final submission.</p>
                                        </div>
                                        <div className="space-y-4 pt-4">
                                            <button
                                                onClick={() => navigate(`/student/hackathons/${selectedHackathon.id}/register`)}
                                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 transition-all hover:-translate-y-0.5"
                                            >
                                                Register Team
                                            </button>
                                            <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl border border-white/5 text-sm transition-colors">
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
                <div className="space-y-8">
                    {/* Consistent Dashboard Style Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Explore <span className="gradient-text">Hackathons</span>
                        </h1>
                        <p className="text-gray-400">Join the most innovative challenges in the tech ecosystem.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {isLoading ? (
                            // Loading Skeletons
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="glass rounded-[2rem] border border-white/5 h-[400px] animate-pulse bg-navy-900/40"></div>
                            ))
                        ) : (
                            hackathons.map((hackathon) => (
                                <div
                                    key={hackathon.id}
                                    onClick={() => handleHackathonClick(hackathon)}
                                    className="glass rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden"
                                >
                                    <div className={`h-40 ${hackathon.image?.startsWith('http') ? '' : hackathon.image} p-6 relative`}>
                                        {hackathon.image?.startsWith('http') && (
                                            <img
                                                src={hackathon.image}
                                                alt={`${hackathon.title} poster`}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        )}
                                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase">
                                            {hackathon.mode}
                                        </div>
                                        <div className="absolute bottom-4 left-6">
                                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{hackathon.organizer}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{hackathon.title}</h3>
                                            {isRegistered(hackathon.id) && (
                                                <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Registered</span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm line-clamp-2 mb-6">
                                            {hackathon.description}
                                        </p>

                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                                <span className="text-xs text-gray-300">{hackathon.participants}</span>
                                            </div>
                                            <button className="flex items-center gap-1.5 text-xs text-purple-400 font-bold hover:text-purple-300 transition-colors">
                                                Select Arena
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-center pt-8">
                        <button className="px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 font-semibold transition-colors">
                            Load More Arenas
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentHackathons;

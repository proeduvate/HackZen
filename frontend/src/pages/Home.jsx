import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchHomeHackathons } from '../services/homeApi';
import ThemeToggle from '../components/ThemeToggle';

// --- Shared Internal Components ---

const Button = ({ children, variant = 'primary', onClick, className = '', to, ...props }) => {
    const baseStyles = 'px-6 py-3 rounded-xl font-bold transition-all duration-300 btn-hover relative z-10 text-sm tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-navy-900 disabled:cursor-not-allowed disabled:opacity-60';
    const variants = {
        primary: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20',
        secondary: 'bg-white dark:bg-purple-950/20 text-slate-800 dark:text-white border-2 border-purple-600 hover:bg-purple-50 hover:text-purple-800 dark:hover:bg-purple-600/20 shadow-sm',
        outline: 'bg-white/80 dark:bg-transparent border-2 border-slate-300 dark:border-white/20 text-slate-800 dark:text-white hover:border-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-600/10',
    };
    const buttonClasses = `${baseStyles} ${variants[variant]} ${className}`;

    if (to) {
        return (
            <Link to={to} className={buttonClasses}>
                <span className="relative z-10">{children}</span>
            </Link>
        );
    }

    return (
        <button className={buttonClasses} onClick={onClick} {...props}>
            <span className="relative z-10">{children}</span>
        </button>
    );
};

const Card = ({ children, className = '', hover = true }) => {
    const hoverClass = hover ? 'card-hover' : '';
    return (
        <div className={`bg-white dark:bg-navy-900/80 glass-strong rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:shadow-none transition-all duration-300 ${hoverClass} ${className}`}>
            {children}
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <Card>
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
    </Card>
);

const HackathonCard = ({ id, domain, title, date, participants, venue }) => {
    const navigate = useNavigate();
    const handleViewDetails = () => {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            navigate('/student/hackathons', { state: { hackathonId: id } });
        } else {
            navigate('/get-started');
        }
    };

    return (
        <Card className="flex flex-col justify-between">
            <div>
                <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-600/30">
                        {domain}
                    </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 leading-snug">{title}</h3>
                <div className="space-y-3 mb-6 text-sm">
                    <div className="flex items-center text-slate-600 dark:text-gray-300">
                        <span className="mr-2">📅</span>
                        <span>{date}</span>
                    </div>
                    <div className="flex items-center text-slate-600 dark:text-gray-300">
                        <span className="mr-2">👥</span>
                        <span>{participants} Participants</span>
                    </div>
                    <div className="flex items-center text-slate-600 dark:text-gray-300">
                        <span className="mr-2">📍</span>
                        <span>{venue}</span>
                    </div>
                </div>
            </div>
            <Button variant="outline" className="w-full mt-2" onClick={handleViewDetails}>
                View Details
            </Button>
        </Card>
    );
};

// --- Sections ---

const Navbar = () => {
    const navigate = useNavigate();

    const handleScroll = (e, targetId) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-slate-200 dark:border-gray-800 bg-white/90 dark:bg-navy-900/80 backdrop-blur-md transition-colors duration-200">
            <div className="container flex items-center justify-between px-4 py-4 mx-auto sm:px-6">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/proeduvate-dark-text.png" alt="ProEduvate" className="h-12 w-auto dark:hidden" />
                    <img src="/proeduvatee-removebg-preview.png" alt="" aria-hidden="true" className="hidden h-12 w-auto dark:block" />
                </Link>
                <div className="items-center hidden gap-8 md:flex">
                    <a href="#hackathons" onClick={(e) => handleScroll(e, 'hackathons')} className="text-slate-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-white font-medium transition">Hackathons</a>
                    <a href="#how-it-works" onClick={(e) => handleScroll(e, 'how-it-works')} className="text-slate-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-white font-medium transition">How It Works</a>
                    <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="text-slate-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-white font-medium transition">Features</a>
                    <a href="#roles" onClick={(e) => handleScroll(e, 'roles')} className="text-slate-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-white font-medium transition">Roles</a>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                    <ThemeToggle />
                    <button onClick={() => navigate('/login')} className="text-slate-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-white font-semibold transition px-2 py-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-navy-900">
                        Sign In
                    </button>
                    <Button variant="primary" className="hidden sm:inline-flex" onClick={() => navigate('/get-started')}>
                        Get Started
                    </Button>
                </div>
            </div>
        </nav>
    );
};

const Hero = () => {
    const navigate = useNavigate();
    return (
        <section className="px-4 pt-28 pb-20 sm:px-6 sm:pt-32">
            <div className="container mx-auto text-center">
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 mb-6">
                    The Ultimate Hackathon Platform
                </span>
                <h1 className="mb-6 text-4xl font-extrabold sm:text-5xl md:text-6xl text-slate-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:to-gray-400 dark:bg-clip-text tracking-tight">
                    Build. Compete. <span className="gradient-text">Innovate.</span>
                </h1>
                <p className="max-w-3xl mx-auto mb-4 text-xl font-semibold text-slate-700 dark:text-gray-300">
                    The Platform To Launch and Join Hackathons
                </p>
                <p className="max-w-2xl mx-auto mb-10 text-slate-600 dark:text-gray-400 leading-relaxed text-base">
                    A unified platform where students, mentors, and organizers collaborate to turn innovative projects into reality.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button variant="primary" onClick={() => navigate('/get-started')}>
                        Get Started <span className="ml-1">→</span>
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/get-started')}>
                        Explore Hackathons
                    </Button>
                </div>
            </div>
        </section>
    );
};

const HackathonsSection = () => {
    const [hackathons, setHackathons] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const loadHackathons = async () => {
            try {
                const formattedData = await fetchHomeHackathons();
                setHackathons(formattedData);
            } catch (err) {
                console.error('Failed to load hackathons:', err);
                setError('Upcoming hackathons are temporarily unavailable.');
            } finally {
                setLoading(false);
            }
        };
        loadHackathons();
    }, []);

    return (
        <section id="hackathons" className="py-20 px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                        Upcoming <span className="gradient-text">Hackathons</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Join exciting hackathons and showcase your skills to the world
                    </p>
                </div>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-12 h-12 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {hackathons.map((hackathon, index) => (
                            <HackathonCard key={index} {...hackathon} />
                        ))}
                    </div>
                )}
                {error && !loading && (
                    <p className="text-center text-slate-500 dark:text-gray-500 mt-4">{error}</p>
                )}
            </div>
        </section>
    );
};

const HowItWorksSection = () => {
    const steps = [
        { icon: '👥', title: 'Register & Join', description: 'Create your account and browse through exciting hackathons tailored to your interests.' },
        { icon: '🤝', title: 'Form Team', description: 'Connect with like-minded innovators and build your dream team for the challenge.' },
        { icon: '</>', title: 'Build & Collaborate', description: 'Work together using our integrated tools, chat features, and collaborative workspace.' },
        { icon: '🏆', title: 'Submit & Win', description: 'Submit your project, get evaluated by expert judges, and win amazing prizes.' },
    ];
    return (
        <section id="how-it-works" className="py-20 px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                        How It <span className="gradient-text">Works</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Four simple steps to transform your ideas into reality
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            <Card hover={false} className="text-center h-full pt-10">
                                <div className="text-5xl mb-4">{step.icon}</div>
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center font-bold text-white text-base shadow-md">
                                    {index + 1}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                                <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">{step.description}</p>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const FeaturesSection = () => {
    const features = [
        { icon: '👥', title: 'Team Management', description: 'Effortlessly create, manage, and collaborate with your team members in real-time.' },
        { icon: '💬', title: 'Built-in Chat', description: 'Communicate seamlessly with integrated chat for teams, mentors, and organizers.' },
        { icon: '📤', title: 'Easy Submissions', description: 'Submit your projects with ease through our streamlined submission portal.' },
        { icon: '🎓', title: 'Issue Certificates', description: 'Automatically generate and distribute certificates to participants and winners.' },
        { icon: '🤖', title: 'AI Assistant', description: 'Get intelligent suggestions and support from our AI-powered assistant.' },
        { icon: '🔐', title: 'Role-Based Access', description: 'Secure platform with customized access for organizers, mentors, and students.' },
        { icon: '⚖️', title: 'Evaluation Panel', description: 'Comprehensive judging system with customizable criteria and scoring.' },
        { icon: '⏱️', title: 'Timeline Control', description: 'Manage hackathon phases, deadlines, and milestones with precision.' },
    ];
    return (
        <section id="features" className="py-20 px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                        Premium <span className="gradient-text">Features</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Everything you need to run successful hackathons, all in one place
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const RolesSection = () => {
    const navigate = useNavigate();
    const roles = [
        {
            icon: '🎯', title: 'Organizer',
            description: 'Create and manage hackathons with powerful tools for event planning, participant management, and evaluation.',
            features: ['Event Dashboard', 'Participant Analytics', 'Certificate Generation', 'Timeline Management'],
        },
        {
            icon: '🎓', title: 'Mentor',
            description: 'Guide and support teams throughout their journey with dedicated mentoring tools and communication channels.',
            features: ['Team Chat', 'Progress Tracking', 'Resource Sharing', 'Feedback System'],
        },
        {
            icon: '👨‍🎓', title: 'Student',
            description: 'Participate in hackathons, collaborate with teams, and showcase your innovative projects to the world.',
            features: ['Team Formation', 'Project Submission', 'Real-time Chat', 'Certificate Access'],
        },
    ];
    return (
        <section id="roles" className="py-20 px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                        Built for <span className="gradient-text">Everyone</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Tailored experiences for organizers, mentors, and students
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {roles.map((role, index) => (
                        <Card key={index} className="flex flex-col justify-between">
                            <div>
                                <div className="text-5xl mb-4 text-center">{role.icon}</div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 text-center">{role.title}</h3>
                                <p className="text-slate-600 dark:text-gray-400 mb-6 text-center text-sm leading-relaxed">{role.description}</p>
                                <div className="space-y-2 mb-6">
                                    {role.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center text-slate-700 dark:text-gray-300 text-sm">
                                            <span className="mr-2 text-purple-600 dark:text-purple-400 font-bold">✓</span>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/get-started')}>
                                Learn More
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

const CTASection = () => {
    const navigate = useNavigate();
    return (
        <section className="px-6 py-20 bg-slate-100/70 dark:bg-navy-900/50 border-t border-b border-slate-200 dark:border-white/5 transition-colors duration-200">
            <div className="container mx-auto text-center">
                <h2 className="mb-4 text-4xl font-extrabold text-slate-900 dark:text-white md:text-5xl tracking-tight">
                    Ready to Transform<br />Your Hackathon Experience?
                </h2>
                <p className="max-w-2xl mx-auto mb-8 text-slate-600 dark:text-gray-400 text-base">
                    Join thousands of students, mentors, and organizers in the world's leading hackathon platform.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button variant="primary" onClick={() => navigate('/get-started')}>
                        Get Started Now <span className="ml-1">→</span>
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/get-started')}>
                        Explore Platform
                    </Button>
                </div>
            </div>
        </section>
    );
};

// --- Main Page ---

const Home = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        const userRole = sessionStorage.getItem('userRole');

        if (isLoggedIn && userRole) {
            navigate(`/${userRole}/dashboard`);
        }
    }, [navigate]);

    return (
        <div className="bg-slate-50 dark:bg-navy-950 text-slate-800 dark:text-white min-h-screen transition-colors duration-200">
            <Navbar />
            <main className="flex-grow">
                <Hero />
                <HackathonsSection />
                <HowItWorksSection />
                <FeaturesSection />
                <RolesSection />
                <CTASection />
            </main>
        </div>
    );
};

export default Home;

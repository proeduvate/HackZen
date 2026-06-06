import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchHomeHackathons } from '../services/homeApi';

// --- Shared Internal Components ---

const Button = ({ children, variant = 'primary', onClick, className = '', to, ...props }) => {
    const baseStyles = 'px-6 py-3 rounded-lg font-semibold transition-all duration-300 btn-hover relative z-10';
    const variants = {
        primary: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700',
        secondary: 'glass text-white border-2 border-purple-600 hover:bg-purple-600/20',
        outline: 'border-2 border-white/20 text-white hover:border-purple-600 hover:bg-purple-600/10',
    };
    const buttonClasses = `${baseStyles} ${variants[variant]} ${className}`;

    if (to) {
        return (
            <Link to={to} className={buttonClasses}>
                {children}
            </Link>
        );
    }

    return (
        <button className={buttonClasses} onClick={onClick} {...props}>
            {children}
        </button>
    );
};

const Card = ({ children, className = '', hover = true }) => {
    const hoverClass = hover ? 'card-hover' : '';
    return (
        <div className={`glass-strong rounded-xl p-6 ${hoverClass} ${className}`}>
            {children}
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <Card>
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </Card>
);

const HackathonCard = ({ id, domain, title, date, participants, venue }) => {
    const navigate = useNavigate();
    const handleViewDetails = () => {
        // Navigate to student hackathons with the selected ID to auto-open details
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            navigate('/student/hackathons', { state: { hackathonId: id } });
        } else {
            navigate('/get-started');
        }
    };

    return (
        <Card>
            <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm font-semibold border border-purple-600/30">
                    {domain}
                </span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
            <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-300">
                    <span className="mr-2">📅</span>
                    <span>{date}</span>
                </div>
                <div className="flex items-center text-gray-300">
                    <span className="mr-2">👥</span>
                    <span>{participants} Participants</span>
                </div>
                <div className="flex items-center text-gray-300">
                    <span className="mr-2">📍</span>
                    <span>{venue}</span>
                </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleViewDetails}>
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
        <nav className="fixed top-0 z-50 w-full border-b border-gray-800 bg-navy-900/80 backdrop-blur-md">
            <div className="container flex items-center justify-between px-6 py-4 mx-auto">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/proeduvatee-removebg-preview.png" alt="ProEduvate" className="h-12" />
                </Link>
                <div className="items-center hidden gap-8 md:flex">
                    <a href="#hackathons" onClick={(e) => handleScroll(e, 'hackathons')} className="text-gray-300 transition hover:text-white">Hackathons</a>
                    <a href="#how-it-works" onClick={(e) => handleScroll(e, 'how-it-works')} className="text-gray-300 transition hover:text-white">How It Works</a>
                    <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="text-gray-300 transition hover:text-white">Features</a>
                    <a href="#roles" onClick={(e) => handleScroll(e, 'roles')} className="text-gray-300 transition hover:text-white">Roles</a>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/login')} className="text-gray-300 transition hover:text-white">
                        Sign In
                    </button>
                    <Button variant="primary" onClick={() => navigate('/get-started')}>
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
        <section className="px-6 pt-32 pb-20">
            <div className="container mx-auto text-center">
                <p className="mb-4 text-purple-400">The Ultimate Hackathon Platform</p>
                <h1 className="mb-6 text-5xl font-bold text-transparent md:text-6xl bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                    Build. Compete. Innovate.
                </h1>
                <p className="max-w-3xl mx-auto mb-12 text-xl text-gray-400">
                    The Platform To Launch and Join Hackathons
                </p>
                <p className="max-w-2xl mx-auto mb-8 text-gray-500">
                    A unified platform where students, mentors, and organizers collaborate to turn innovative projects into reality.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button variant="primary" onClick={() => navigate('/get-started')}>
                        Get Started <span>→</span>
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
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Upcoming <span className="gradient-text">Hackathons</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
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
                    <p className="text-center text-gray-500 mt-4">{error}</p>
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
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        How It <span className="gradient-text">Works</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Four simple steps to transform your ideas into reality
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            <Card hover={false} className="text-center h-full">
                                <div className="text-6xl mb-4">{step.icon}</div>
                                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center font-bold text-white text-xl glow-purple">
                                    {index + 1}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                                <p className="text-gray-400">{step.description}</p>
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
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Premium <span className="gradient-text">Features</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
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
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Built for <span className="gradient-text">Everyone</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Tailored experiences for organizers, mentors, and students
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {roles.map((role, index) => (
                        <Card key={index}>
                            <div className="text-6xl mb-4 text-center">{role.icon}</div>
                            <h3 className="text-2xl font-bold text-white mb-3 text-center">{role.title}</h3>
                            <p className="text-gray-400 mb-6 text-center">{role.description}</p>
                            <div className="space-y-2 mb-6">
                                {role.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center text-gray-300">
                                        <span className="mr-2 text-purple-400">✓</span>
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => navigate('/get-started')}>
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
        <section className="px-6 py-20 bg-navy-900/50">
            <div className="container mx-auto text-center">
                <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
                    Ready to Transform<br />Your Hackathon Experience?
                </h2>
                <p className="max-w-2xl mx-auto mb-8 text-gray-400">
                    Join thousands of students, mentors, and organizers in the world's leading hackathon platform.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button variant="primary" onClick={() => navigate('/get-started')}>
                        Get Started Now <span>→</span>
                    </Button>
                    <Button variant="secondary">Schedule Demo</Button>
                </div>
            </div>
        </section>
    );
};

// --- Main Page ---

const Home = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        // Session Intelligence: Auto-redirect authenticated users
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        const userRole = sessionStorage.getItem('userRole');

        if (isLoggedIn && userRole) {
            navigate(`/${userRole}/dashboard`);
        }
    }, [navigate]);

    return (
        <>
            <Navbar />
            <main className="flex-grow">
                <Hero />
                <HackathonsSection />
                <HowItWorksSection />
                <FeaturesSection />
                <RolesSection />
                <CTASection />
            </main>
        </>
    );
};

export default Home;

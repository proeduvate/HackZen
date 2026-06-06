/**
 * Admin Disputes API (Mock)
 * Simulates backend functionality for managing platform disputes and investigations.
 */

const STORAGE_KEY = 'admin_disputes_data';
const MOCK_DELAY = 600;

const INITIAL_DISPUTES = [
    {
        id: 1,
        type: 'Plagiarism Allegation',
        team: 'CyberKnights',
        time: '2 hours ago',
        status: 'investigating',
        priority: 'High',
        hackathonId: 'h1',
        reporter: { name: 'John Doe', initials: 'JD', role: 'Mentor', org: 'Tech University' },
        reportedTeam: { name: 'CyberKnights', initials: 'CK', type: 'Student Team', members: 4 },
        description:
            'The team "CyberKnights" has been reported for using pre-written code in their project "AI Health Assistant". The reporter claims the core algorithm was taken from a GitHub repository without proper attribution, violating Rule 4.2 of the competition.',
        evidence: [
            { label: 'Evidence Link 1', url: '#' },
            { label: 'GitHub Reference', url: '#' },
        ],
        workflow: [
            { label: 'Report Received', detail: 'Oct 24, 2024 • 10:12 AM', active: true },
            { label: 'Under Investigation', detail: 'Platform admin assigned to verify codebase.', sub: 'Oct 24, 2024 • 02:45 PM', active: true },
            { label: 'Final Decision', detail: 'Pending final review', active: false },
        ],
    },
    {
        id: 2,
        type: 'Harassment Report',
        team: 'Alpha Coders',
        time: '5 hours ago',
        status: 'open',
        priority: 'Critical',
        hackathonId: 'h2',
        reporter: { name: 'Sara Lin', initials: 'SL', role: 'Student', org: 'MIT' },
        reportedTeam: { name: 'Alpha Coders', initials: 'AC', type: 'Student Team', members: 3 },
        description:
            'A member of Alpha Coders sent threatening messages through the platform chat to members of competing teams. Screenshots have been shared as evidence.',
        evidence: [{ label: 'Screenshot 1', url: '#' }],
        workflow: [
            { label: 'Report Received', detail: 'Oct 22, 2024 • 08:00 AM', active: true },
            { label: 'Under Investigation', detail: 'Awaiting admin assignment.', sub: '', active: false },
            { label: 'Final Decision', detail: '', active: false },
        ],
    },
    {
        id: 3,
        type: 'Rule Violation',
        team: 'Tech Wizards',
        time: '1 day ago',
        status: 'resolved',
        priority: 'Medium',
        hackathonId: 'h3',
        reporter: { name: 'Raj Kumar', initials: 'RK', role: 'Organizer', org: 'Stanford' },
        reportedTeam: { name: 'Tech Wizards', initials: 'TW', type: 'Student Team', members: 5 },
        description:
            'Tech Wizards submitted a project that did not meet the minimum code originality threshold as defined in Section 3.1 of the rulebook.',
        evidence: [],
        workflow: [
            { label: 'Report Received', detail: 'Oct 20, 2024 • 09:00 AM', active: true },
            { label: 'Under Investigation', detail: 'Review completed.', sub: 'Oct 21, 2024 • 11:00 AM', active: true },
            { label: 'Final Decision', detail: 'Warning issued. Team retained.', sub: 'Oct 22, 2024 • 03:00 PM', active: true },
        ],
    },
];

const initializeData = () => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DISPUTES));
    }
};

const getData = () => {
    initializeData();
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
};

const saveData = (data) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getDisputes = async (statusFilter) => {
    await delay(MOCK_DELAY);
    const data = getData();
    if (statusFilter) {
        if (statusFilter.toLowerCase() === 'open') {
            return data.filter(d => d.status !== 'resolved');
        } else if (statusFilter.toLowerCase() === 'resolved') {
            return data.filter(d => d.status === 'resolved');
        }
    }
    return data;
};

export const getDisputeById = async (id) => {
    await delay(MOCK_DELAY);
    const data = getData();
    return data.find(d => d.id === id);
};

export const suspendUser = async (id) => {
    await delay(1000);
    const data = getData();
    const index = data.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Dispute not found");

    // Add suspension step
    data[index] = {
        ...data[index],
        workflow: [
            ...data[index].workflow,
            { label: 'User Suspended', detail: 'System Action', active: true }
        ]
    };
    saveData(data);
    return { success: true };
};

export const requestMoreInfo = async (id, message) => {
    await delay(1000);
    const data = getData();
    const index = data.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Dispute not found");

    // Push info request workflow step
    data[index] = {
        ...data[index],
        workflow: [
            ...data[index].workflow,
            { label: 'Additional Info Requested', detail: message, active: true }
        ]
    };
    saveData(data);
    return { success: true };
};

export const submitResolution = async (id, resolution) => {
    await delay(1200);
    const data = getData();
    const index = data.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Dispute not found");

    const activeWorkflow = data[index].workflow;
    if (activeWorkflow.length >= 3) {
        activeWorkflow[2] = { ...activeWorkflow[2], active: true, detail: resolution };
    } else {
        activeWorkflow.push({ label: 'Final Decision', detail: resolution, active: true });
    }

    data[index] = {
        ...data[index],
        status: 'resolved',
        workflow: activeWorkflow
    };
    
    saveData(data);
    return data[index];
};

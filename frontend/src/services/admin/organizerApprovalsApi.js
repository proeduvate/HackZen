/**
 * Admin Organizer (User) Approvals API (Mock)
 * Simulates backend functionality for fetching and managing organizer approval requests
 * without backend integration.
 */

const STORAGE_KEY = 'admin_organizer_approvals_data';
const MOCK_DELAY = 800; // Simulated network delay

const INITIAL_ORGANIZERS = [
    { id: 1, name: 'Sarah Chen', role: 'Community Lead', organization: 'TechHub Global', website: 'techhub.io', orgType: 'Incubator', appliedAt: 'Oct 24, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=3b82f6&color=fff' },
    { id: 2, name: 'Michael Rodriguez', role: 'Event Director', organization: 'DevCon Foundation', website: 'devcon.org', orgType: 'Non-Profit', appliedAt: 'Oct 23, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=Michael+Rodriguez&background=10b981&color=fff' },
    { id: 3, name: 'James Wilson', role: 'Founder', organization: 'Hackers University', website: 'hackersu.edu', orgType: 'University Chapter', appliedAt: 'Oct 22, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=James+Wilson&background=8b5cf6&color=fff' },
    { id: 4, name: 'Elena Popova', role: 'CTO', organization: 'InnoCorp Solutions', website: 'innocorp.tech', orgType: 'Corporate', appliedAt: 'Oct 21, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=Elena+Popova&background=f59e0b&color=fff' },
    { id: 5, name: 'David Kim', role: 'President', organization: 'Code Alliance', website: 'codealliance.org', orgType: 'Non-Profit', appliedAt: 'Oct 20, 2024', status: 'Approved', image: 'https://ui-avatars.com/api/?name=David+Kim&background=8b5cf6&color=fff' },
    { id: 6, name: 'Alice Johnson', role: 'Lead Organizer', organization: 'Tech Fest 2025', website: 'techfest.com', orgType: 'Event', appliedAt: 'Oct 19, 2024', status: 'Rejected', image: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=ef4444&color=fff' }
];

const initializeData = () => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ORGANIZERS));
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

/**
 * Fetch all organizer approval requests
 * @returns {Promise<Array>}
 */
export const fetchOrganizerApprovals = async () => {
    await delay(MOCK_DELAY);
    return getData();
};

/**
 * Update the status of an organizer approval request
 * @param {number} id - Organizer ID
 * @param {string} action - 'approving' or 'rejecting'
 * @returns {Promise<{success: boolean, updatedData: Array}>}
 */
export const updateOrganizerStatus = async (id, action) => {
    await delay(1200); // Simulate processing time
    const data = getData();
    
    const updatedData = data.map(org => 
        org.id === id 
            ? { ...org, status: action === 'approving' ? 'Approved' : 'Rejected' } 
            : org
    );

    saveData(updatedData);

    return { 
        success: true, 
        updatedData 
    };
};

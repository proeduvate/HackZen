import apiClient from '../../api/api';

/**
 * Student Certificates API
 * Provides service functions for certificate management and verification using the real backend.
 */

/**
 * Fetches all certificates for the current student.
 */
export const fetchCertificates = async () => {
    try {
        const { data } = await apiClient.get('/certificates/me');
        
        return data.map(c => ({
            id: c._id,
            title: 'Hackathon Award', // Placeholder until hackathon title join
            issuer: 'ProEduvate Platform',
            date: new Date(c.issuedAt).toLocaleDateString(),
            category: 'Participant',
            image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=2070&auto=format&fit=crop',
            status: 'Verified',
            isDownloading: false,
            url: c.certificateUrl
        }));
    } catch (error) {
        console.error('Failed to fetch certificates:', error);
        return [];
    }
};

/**
 * Verifies a certificate by its unique ID.
 * @param {string} certId 
 */
export const verifyCertificate = async (certId) => {
    try {
        const { data } = await apiClient.get(`/certificates/${certId}`);
        return {
            status: 'success',
            message: `Certificate ${certId} is Authentic`,
            recipient: 'Authenticated User',
            event: 'ProEduvate Hackathon',
            date: new Date(data.issuedAt).toLocaleDateString()
        };
    } catch (error) {
        console.error('Verification failed:', error);
        return {
            status: 'error',
            message: 'No record found with this ID',
            recipient: '-',
            event: '-',
            date: '-'
        };
    }
};

/**
 * Simulates downloading a certificate.
 */
export const downloadCertificate = async (certId) => {
    // In a real app, this would open a PDF link
    return { success: true, message: `Redirecting to certificate view...` };
};

/**
 * Simulates downloading all certificates as an archive.
 */
export const downloadAllCertificates = async () => {
    return { success: true, message: 'Archive generation started...' };
};

/**
 * Simulates sharing the transcript link.
 */
export const shareTranscript = async () => {
    return { success: true, shareLink: window.location.origin + '/share/profile' };
};

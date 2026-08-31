import apiClient from '../../api/api';

const DEFAULT_CERTIFICATE_IMAGE = 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=2070&auto=format&fit=crop';

const getCertificatePreview = (url) => (
    url && !url.toLowerCase().endsWith('.pdf') ? url : DEFAULT_CERTIFICATE_IMAGE
);

export const normalizeCertificate = (certificate) => {
    const certificateUrl = certificate.certificateUrl || '';

    return {
        id: certificate._id || certificate.id,
        title: certificate.title || 'Hackathon Award',
        issuer: 'ProEduvate Platform',
        date: certificate.completionDate || new Date(certificate.issuedAt).toISOString().slice(0, 10),
        description: certificate.description || '',
        category: 'Participant',
        image: getCertificatePreview(certificateUrl),
        status: 'Verified',
        isDownloading: false,
        url: certificateUrl,
    };
};

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

        return data.map(normalizeCertificate);
    } catch (error) {
        console.error('Failed to fetch certificates:', error);
        return [];
    }
};

export const uploadCertificate = async (formData) => {
    const { data } = await apiClient.post('/certificates/student/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

export const updateCertificate = async (certificateId, formData) => {
    const { data } = await apiClient.put(`/certificates/student/${certificateId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

export const deleteCertificate = async (certificateId) => {
    const { data } = await apiClient.delete(`/certificates/student/${certificateId}`);
    return data;
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

export const downloadCertificate = async (certificate) => {
    if (!certificate?.url) {
        throw new Error('No uploaded certificate file found');
    }

    const extension = certificate.url.split('.').pop()?.split('?')[0] || 'file';
    const safeTitle = (certificate.title || 'certificate').replace(/[^a-z0-9_-]+/gi, '-');
    const link = document.createElement('a');

    link.href = certificate.url;
    link.download = `${safeTitle}.${extension}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true };
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

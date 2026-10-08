import apiClient from '../../api/api';

const DEFAULT_CERTIFICATE_IMAGE = 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=2070&auto=format&fit=crop';

const getCertificatePreview = (url) => (
    url && !url.toLowerCase().endsWith('.pdf') ? url : DEFAULT_CERTIFICATE_IMAGE
);

export const normalizeCertificate = (certificate) => {
    const certificateUrl = certificate.certificateUrl || '';

    return {
        id: certificate._id || certificate.id,
        validationId: certificate.validationId || (certificate._id ? `CERT-${String(certificate._id).slice(-6).toUpperCase()}` : ''),
        title: certificate.title || certificate.certificateType || 'Hackathon Award',
        issuer: certificate.eventTitle || certificate.hackathonTitle || 'ProEduvate Platform',
        date: certificate.completionDate || (certificate.issuedAt ? new Date(certificate.issuedAt).toISOString().slice(0, 10) : 'Recently'),
        description: certificate.description || '',
        category: certificate.certificateType || 'Participant',
        image: getCertificatePreview(certificateUrl),
        status: certificate.status || 'Verified',
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
 * Verifies a certificate by its unique validation ID or document ID.
 * @param {string} certId 
 */
export const verifyCertificate = async (certId) => {
    try {
        const { data } = await apiClient.get(`/certificates/verify/${encodeURIComponent(certId.trim())}`);
        if (data.verified || data.valid) {
            return {
                status: 'success',
                message: data.message || `Certificate ${certId} is Authentic`,
                recipient: data.recipientName || 'Authenticated User',
                event: data.eventTitle || 'ProEduvate Hackathon',
                date: data.dateIssued || 'Recently'
            };
        }
        return {
            status: 'error',
            message: data.message || 'No record found with this ID',
            recipient: '-',
            event: '-',
            date: '-'
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
    try {
        const certId = certificate.id || certificate._id || certificate.validationId;
        if (certId) {
            const response = await apiClient.get(`/certificates/${certId}/download`, {
                responseType: 'blob'
            });
            const contentType = response.headers['content-type'] || 'application/pdf';
            const blob = new Blob([response.data], { type: contentType });
            const downloadUrl = window.URL.createObjectURL(blob);
            const safeTitle = (certificate.title || 'certificate').replace(/[^a-z0-9_-]+/gi, '-');
            const ext = contentType.includes('svg') ? 'svg' : contentType.includes('png') ? 'png' : 'pdf';
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${safeTitle}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            return { success: true };
        }
    } catch (apiErr) {
        console.warn('Backend certificate download fallback to direct URL:', apiErr);
    }

    if (certificate?.url) {
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
    }

    throw new Error('Certificate download file could not be generated');
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

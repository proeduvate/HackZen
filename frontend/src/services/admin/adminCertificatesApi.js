import apiClient from '../../api/api';

/**
 * Admin Certificates API
 * Fetches, verifies, and revokes operational certificates using real backend endpoints.
 */

/**
 * Fetch all generated certificates
 * @returns {Promise<Array>}
 */
export const fetchCertificates = async () => {
    try {
        const { data } = await apiClient.get('/certificates/admin/all');
        return data;
    } catch (error) {
        console.error('Failed to fetch certificates:', error);
        throw error;
    }
};

/**
 * Verify a certificate by ValidationID
 * @param {string} validationId
 * @returns {Promise<{success: boolean, message: string, certificate?: Object}>}
 */
export const verifyCertificate = async (validationId) => {
    try {
        const { data } = await apiClient.get(`/certificates/admin/verify/${validationId}`);
        return data;
    } catch (error) {
        console.error('Failed to verify certificate:', error);
        throw error;
    }
};

/**
 * Revoke an active certificate
 * @param {string} certificateId
 * @returns {Promise<{success: boolean}>}
 */
export const revokeCertificate = async (certificateId) => {
    try {
        await apiClient.post(`/certificates/admin/${certificateId}/revoke`);
        // Refetch full list so caller gets the updated state
        const updatedData = await fetchCertificates();
        return { success: true, updatedData };
    } catch (error) {
        console.error('Failed to revoke certificate:', error);
        throw error;
    }
};

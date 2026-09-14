import apiClient from './apiClient';
import { uploadImageAsset } from './imageUploadHelper';

/**
 * Tenant Image Service - vuokralaisen profiilikuvien hallinta
 */
const tenantImageService = {
  getImages: (tenantId) =>
    apiClient.get(`/v1/tenants/${tenantId}/images`),

  uploadImage: (tenantId, imageAsset) =>
    uploadImageAsset(`${apiClient.baseURL}/v1/tenants/${tenantId}/images`, imageAsset),

  deleteImage: (tenantId, imageId) =>
    apiClient.delete(`/v1/tenants/${tenantId}/images/${imageId}`),

  setPrimaryImage: (tenantId, imageId) =>
    apiClient.patch(`/v1/tenants/${tenantId}/images/${imageId}`, { isPrimary: true }),
};

export default tenantImageService;

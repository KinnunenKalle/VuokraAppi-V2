import apiClient from './apiClient';
import { uploadImageAsset } from './imageUploadHelper';

const apartmentService = {
  getAllApartments: () =>
    apiClient.get('/v1/apartments'),

  getUserApartments: (userId) =>
    apiClient.get(`/v1/users/${userId}/apartments`),

  createApartment: (data) =>
    apiClient.post('/v1/apartments', data),

  updateApartment: (id, data) =>
    apiClient.patch(`/v1/apartments/${id}`, data),

  deleteApartment: (id) =>
    apiClient.delete(`/v1/apartments/${id}`),

  // Generoi AI-ilmoitus JA tallentaa sen kohteeseen (listingText, rentSuggestion*).
  // Vaatii että kohde on jo luotu (apartmentId).
  generateListing: (apartmentId, data) =>
    apiClient.post(`/v1/apartments/${apartmentId}/listing/generate`, data),

  getImages: (apartmentId) =>
    apiClient.get(`/v1/apartments/${apartmentId}/images`),

  uploadImage: (apartmentId, imageAsset) =>
    uploadImageAsset(`${apiClient.baseURL}/v1/apartments/${apartmentId}/images`, imageAsset),

  deleteImage: (apartmentId, imageId) =>
    apiClient.delete(`/v1/apartments/${apartmentId}/images/${imageId}`),

  setPrimaryImage: (apartmentId, imageId) =>
    apiClient.patch(`/v1/apartments/${apartmentId}/images/${imageId}`, { isPrimary: true }),
};

export default apartmentService;

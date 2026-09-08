import apiClient from './apiClient';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const normalizeMimeType = (mimeType) => {
  if (!mimeType) return 'image/jpeg';
  if (mimeType === 'image/jpg') return 'image/jpeg';
  if (mimeType === 'image/png') return 'image/png';
  if (mimeType === 'image/webp') return 'image/webp';
  // HEIC, HEIF ja muut iOS-formaatit → jpeg
  return 'image/jpeg';
};

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

  generateListing: (data) =>
    apiClient.post('/listings/v1/generate', data),

  getImages: (apartmentId) =>
    apiClient.get(`/v1/apartments/${apartmentId}/images`),

  uploadImage: async (apartmentId, imageAsset) => {
    const headers = await apiClient.createHeaders(true, {});
    // uploadAsync asettaa Content-Typen itse multipart boundarylla
    delete headers['Content-Type'];

    let uri = imageAsset.uri;
    let mimeType = normalizeMimeType(imageAsset.mimeType);

    // Konvertoi HEIC/HEIF → JPEG
    if (imageAsset.mimeType === 'image/heic' || imageAsset.mimeType === 'image/heif'
        || imageAsset.uri?.toLowerCase().endsWith('.heic')
        || imageAsset.uri?.toLowerCase().endsWith('.heif')) {
      const converted = await ImageManipulator.manipulateAsync(
        imageAsset.uri,
        [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      uri = converted.uri;
      mimeType = 'image/jpeg';
    }

    // Käytetään expo-file-systemin natiivia uploadAsyncia fetch+FormData:n sijaan —
    // React Native New Architecturessa käsintehty multipart FormData-lataus jää
    // paikallisilla file:// URIeilla usein hiljaa roikkumaan.
    const result = await FileSystem.uploadAsync(
      `${apiClient.baseURL}/v1/apartments/${apartmentId}/images`,
      uri,
      {
        httpMethod: 'POST',
        headers,
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        parameters: {},
      }
    );

    const response = {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      url: `${apiClient.baseURL}/v1/apartments/${apartmentId}/images`,
      headers: { get: (name) => (name === 'content-type' ? 'application/json' : null) },
      json: async () => JSON.parse(result.body),
      text: async () => result.body,
    };
    return apiClient.handleResponse(response);
  },

  deleteImage: (apartmentId, imageId) =>
    apiClient.delete(`/v1/apartments/${apartmentId}/images/${imageId}`),

  setPrimaryImage: (apartmentId, imageId) =>
    apiClient.patch(`/v1/apartments/${apartmentId}/images/${imageId}`, { isPrimary: true }),
};

export default apartmentService;

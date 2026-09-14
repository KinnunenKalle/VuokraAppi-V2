import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import apiClient from './apiClient';

export const normalizeMimeType = (mimeType) => {
  if (!mimeType) return 'image/jpeg';
  if (mimeType === 'image/jpg') return 'image/jpeg';
  if (mimeType === 'image/png') return 'image/png';
  if (mimeType === 'image/webp') return 'image/webp';
  // HEIC, HEIF ja muut iOS-formaatit → jpeg
  return 'image/jpeg';
};

/**
 * Lataa kuvan annettuun endpointtiin. Käyttää expo-file-systemin natiivia
 * uploadAsyncia fetch+FormData:n sijaan — React Native New Architecturessa
 * käsintehty multipart FormData-lataus jää paikallisilla file:// URIeilla
 * usein hiljaa roikkumaan.
 */
export const uploadImageAsset = async (url, imageAsset) => {
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

  const result = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'POST',
    headers,
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    parameters: {},
  });

  const response = {
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    url,
    headers: { get: (name) => (name === 'content-type' ? 'application/json' : null) },
    json: async () => JSON.parse(result.body),
    text: async () => result.body,
  };
  return apiClient.handleResponse(response);
};

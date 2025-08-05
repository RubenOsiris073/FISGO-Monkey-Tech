// Obtener la URL base del backend
const getBackendUrl = () => {
  // En desarrollo, usar URLs relativas para aprovechar el proxy de Vite
  if (import.meta.env.DEV) {
    return '';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

/**
 * Construir URL completa para una imagen de producto desde el backend
 * @param {string} imageUrl - URL relativa de la imagen (ej: "/images/products/coca-cola.jpg")
 * @returns {string} URL completa del backend
 */
export const getProductImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return `${getBackendUrl()}/images/no-image.jpg`;
  }
  
  // Si ya es una URL completa, devolverla tal como está
  if (imageUrl.startsWith('http') || imageUrl.startsWith('https')) {
    return imageUrl;
  }
  
  // Si es una URL relativa, construir la URL completa del backend
  const backendUrl = getBackendUrl();
  const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  return `${backendUrl}${cleanImageUrl}`;
};

/**
 * Obtener URL de imagen por defecto
 * @returns {string} URL de la imagen por defecto
 */
export const getDefaultImageUrl = () => {
  return `${getBackendUrl()}/images/no-image.jpg`;
};

/**
 * Verificar si una imagen existe (básico)
 * @param {string} imageUrl - URL de la imagen
 * @returns {Promise<boolean>} true si la imagen existe
 */
export const checkImageExists = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('Error verificando imagen:', error);
    return false;
  }
};

export default {
  getProductImageUrl,
  getDefaultImageUrl,
  checkImageExists
};

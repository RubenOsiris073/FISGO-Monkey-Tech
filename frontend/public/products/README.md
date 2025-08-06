# Carpeta de Imágenes de Productos

Esta carpeta contiene las imágenes de los productos detectados por el modelo TensorFlow.

## Nombres de archivos requeridos:

Basados en los labels del modelo:

- `Botella_Ciel_100ML.jpg`
- `Cacahuates_Kiyakis_120G.jpg`
- `Trident_13G.jpg`
- `Del Valle_413ML.jpg`
- `Pop_45G.jpg`
- `Dr.Peppe_335ML.jpg`
- `Sabritas_150G.jpg`
- `Takis_70G.jpg`

## Formato:
- Tamaño recomendado: 300x300px o superior
- Formato: JPG o PNG
- Calidad: Alta resolución para mejor visualización en las cards

## Uso:
Las imágenes se asignan automáticamente cuando:
1. Se detecta un producto con la cámara
2. Se consultan detecciones previas
3. Se muestran productos en las cards modernas

Si no se encuentra una imagen, se mostrará la imagen por defecto `/no-image.jpg`.

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// Inicializa el cliente de S3
const S3 = new S3Client();
// Lee las variables de entorno
const DEST_BUCKET = process.env.DEST_BUCKET;
const THUMBNAIL_WIDTH = 200; // Ancho de la miniatura en píxeles

// Formatos de imagen soportados
const SUPPORTED_FORMATS = { jpg: true, jpeg: true, png: true };

// Función principal que maneja el evento
export const handler = async (event, _context) => {
  const { eventTime, s3 } = event.Records[0];
  const srcBucket = s3.bucket.name;
  // La clave del objeto puede tener espacios o caracteres unicode no ASCII
  const srcKey = decodeURIComponent(s3.object.key.replace(/\+/g, " "));
  const ext = srcKey.replace(/^.*\./, "").toLowerCase();
  console.log(`${eventTime} - ${srcBucket}/${srcKey}`);
  // Verifica si el formato del archivo es soportado
  if (!SUPPORTED_FORMATS[ext]) {
    console.log(`ERROR: Unsupported file type (${ext})`);
    return;
  }

  try {
    // Obtiene la imagen del bucket de origen
    const { Body, ContentType } = await S3.send(new GetObjectCommand({ Bucket: srcBucket, Key: srcKey }));
    // Convierte el cuerpo de la respuesta en un array de bytes
    const image = await Body.transformToByteArray();
    // Redimensiona la imagen
    const outputBuffer = await sharp(image).resize(THUMBNAIL_WIDTH).toBuffer();
    // Almacena la nueva imagen en el bucket de destino
    await S3.send(new PutObjectCommand({ Bucket: DEST_BUCKET, Key: srcKey, Body: outputBuffer, ContentType })
    );

    const message = `Successfully resized ${srcBucket}/${srcKey} and uploaded to ${DEST_BUCKET}/${srcKey}`;
    console.log(message);
    return { statusCode: 200, body: message };
  } catch (error) {
    console.log(error);
  }
};

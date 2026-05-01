import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

let isCloudinaryConfigured = false;
const DEFAULT_CHUNK_SIZE = 20 * 1024 * 1024;

const ensureCloudinaryConfigured = () => {
  if (isCloudinaryConfigured) return true;

  const hasCloudinaryConfig = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinaryConfig) {
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  isCloudinaryConfigured = true;
  return true;
};

const uploadToCloudinaryRemote = async (buffer, options = {}) => {
  const uploadOptions = {
    folder: options.folder || "scriptbridge/misc",
    resource_type: options.resource_type || "auto",
  };

  if (options.public_id) {
    uploadOptions.public_id = options.public_id;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });

    stream.end(buffer);
  });
};

const uploadToCloudinaryChunkedRemote = async (buffer, options = {}) => {
  const uploadOptions = {
    folder: options.folder || "scriptbridge/misc",
    resource_type: options.resource_type || "auto",
    chunk_size: options.chunk_size || DEFAULT_CHUNK_SIZE,
  };

  if (options.public_id) {
    uploadOptions.public_id = options.public_id;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_chunked_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });

    Readable.from(buffer).pipe(stream).on("error", reject);
  });
};

const deleteFromCloudinaryRemote = async (publicId, options = {}) => {
  const destroyOptions = {
    resource_type: options.resource_type || "image",
  };

  return cloudinary.uploader.destroy(publicId, destroyOptions);
};

export const uploadToCloudinary = async (buffer, options = {}) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("uploadToCloudinary expects a file buffer");
  }

  if (!ensureCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  if (options.chunked) {
    return uploadToCloudinaryChunkedRemote(buffer, options);
  }

  return uploadToCloudinaryRemote(buffer, options);
};

export const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!publicId || typeof publicId !== "string") {
    throw new Error("deleteFromCloudinary expects a publicId string");
  }

  if (!ensureCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  return deleteFromCloudinaryRemote(publicId, options);
};

export const buildPrivateDownloadUrl = (publicId, format, options = {}) => {
  if (!publicId || typeof publicId !== "string") {
    throw new Error("buildPrivateDownloadUrl expects a publicId string");
  }

  if (!format || typeof format !== "string") {
    throw new Error("buildPrivateDownloadUrl expects a format string");
  }

  if (!ensureCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: options.resource_type || "raw",
    type: options.type || "upload",
    expires_at: options.expires_at,
    attachment: options.attachment === true,
    secure: true,
  });
};

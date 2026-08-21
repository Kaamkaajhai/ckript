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

/*
 * Send one already-bounded part of a manual Cloudinary chunked upload.
 *
 * `upload_stream` still signs the request server-side, but the two protocol
 * headers make separate HTTP requests belong to one upstream upload. Callers
 * persist the acknowledged ranges; this helper deliberately owns no session
 * state and never receives the whole file.
 */
export const uploadChunkToCloudinary = async (buffer, options = {}) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("uploadChunkToCloudinary expects a non-empty file buffer");
  }
  if (!options.uploadId || typeof options.uploadId !== "string") {
    throw new Error("uploadChunkToCloudinary expects an uploadId");
  }
  if (![options.start, options.end, options.total].every(Number.isSafeInteger)) {
    throw new Error("uploadChunkToCloudinary expects integer byte bounds");
  }
  if (options.start < 0 || options.end < options.start || options.total <= options.end) {
    throw new Error("uploadChunkToCloudinary received an invalid byte range");
  }
  if (!ensureCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  const uploadOptions = {
    folder: options.folder || "scriptbridge/misc",
    resource_type: options.resource_type || "auto",
    public_id: options.public_id,
    filename: options.filename || "file",
    overwrite: false,
    x_unique_upload_id: options.uploadId,
    content_range: `bytes ${options.start}-${options.end}/${options.total}`,
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(buffer);
  });
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

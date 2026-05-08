// const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
// const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// export const uploadToCloudinary = async (file, type = "image") => {
//     try {
//         console.log("Uploading file:", file); // ✅ Log the file to debug
//         const formData = new FormData();
//         formData.append("file", file);
//         formData.append("upload_preset", uploadPreset);

//         const resourceType = type === "video" ? "video" : "image"; // Determine file type

//         const response = await fetch(
//             `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
//             {
//                 method: "POST",
//                 body: formData,
//             }
//         );

//         const data = await response.json();

//         if (!response.ok) {
//             throw new Error(data.error?.message || "Error uploading file");
//         }

//         console.log("Cloudinary Upload Successful:", data.secure_url); // ✅ Debug log
//         return data.secure_url; // ✅ Return the uploaded file URL
//     } catch (error) {
//         console.error("Cloudinary Upload Error:", error);
//         return null;
//     }
// };

// Version 2

// const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
// const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// export const uploadToCloudinary = async (file, type = "image", itemName = "file") => {
//     try {
//         if (!file) return null;

//         const formData = new FormData();
//         formData.append("file", file);
//         formData.append("upload_preset", uploadPreset);

//         const resourceType = type === "video" ? "video" : "image"; // Determine file type

//         // ✅ Generate a cleaner filename
//         const timestamp = Date.now();
//         const extension = file.name.split(".").pop(); // Get file extension
//         const formattedName = itemName.toLowerCase().replace(/[^a-z0-9]/g, "-"); // Remove special characters
//         const newFileName = `${formattedName}-${timestamp}`;

//         formData.append("public_id", newFileName); // ✅ Set Cloudinary public_id

//         const response = await fetch(
//             `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
//             {
//                 method: "POST",
//                 body: formData,
//             }
//         );

//         const data = await response.json();

//         if (!response.ok) {
//             throw new Error(data.error?.message || "Error uploading file");
//         }

//         console.log("✅ Cloudinary Upload Successful:", data.secure_url);
//         return data.secure_url; // ✅ Return the uploaded file URL
//     } catch (error) {
//         console.error("❌ Cloudinary Upload Error:", error);
//         return null;
//     }
// };

// Version 3

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
// Puedes seguir usando un único preset si permite folder/public_id.
// Si prefieres separar, crea dos presets y pásalos por options.uploadPreset.
const defaultUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Subida genérica a Cloudinary con control de folder y public_id
 * @param {File|Blob} file
 * @param {"image"|"video"} resourceType
 * @param {Object} options
 * @param {string} options.baseName - basename sin extensión (ej: "VA_1_5")
 * @param {string} [options.folder] - carpeta en Cloudinary (ej: "exercises/videos")
 * @param {string} [options.uploadPreset] - override del preset si quieres usar uno por tipo
 * @returns {Promise<{url: string, publicId: string, resourceType: string, format: string}>}
 */
export const uploadToCloudinary = async (file, resourceType = "image", options = {}) => {
    try {
        if (!file) return null;

        const {
            baseName = "file",
            folder = "",
            uploadPreset = defaultUploadPreset,
        } = options;

        const ts = Date.now();
        const safeBase = String(baseName).toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "");
        // const publicId = folder ? `${folder}/${safeBase}_${ts}` : `${safeBase}_${ts}`;
        const publicId = `${safeBase}_${ts}`;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("public_id", publicId); // sin extensión
        if (folder) {
            formData.append("folder", folder);
        }

        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const res = await fetch(endpoint, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error?.message || "Cloudinary upload failed");
        }

        return {
            url: data.secure_url,
            publicId: data.public_id,       // incluye folder si lo hubo
            resourceType: data.resource_type,
            format: data.format,            // "mp4", "gif", etc.
        };
    } catch (err) {
        console.error("❌ Cloudinary Upload Error:", err);
        return null;
    }
};

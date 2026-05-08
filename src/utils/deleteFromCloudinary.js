export const deleteFromCloudinary = async (imageUrl, backendUrl, token) => {
    try {
        if (!imageUrl) return false;

        // ✅ Extract Public ID from Cloudinary URL
        const urlParts = imageUrl.split("/");
        const filename = urlParts[urlParts.length - 1]; // Extracts `images_xcvicn.jpg`
        const publicId = filename.split(".")[0]; // Removes `.jpg` or `.png`

        console.log("🔥 Deleting Image with Public ID:", publicId);

        // ✅ Call the Django API to delete the image
        const response = await fetch(`${backendUrl}/api/data/delete-image/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${token}`,
            },
            body: JSON.stringify({ public_id: publicId }),
        });

        if (!response.ok) {
            console.error("❌ API Response Error:", response.statusText);
            return false;
        }

        const result = await response.json();
        console.log("✅ Cloudinary Deletion Result:", result);

        return result.result.result === "ok"; // ✅ Ensure deletion was successful
    } catch (error) {
        console.error("❌ Error deleting image from Cloudinary:", error);
        return false;
    }
};
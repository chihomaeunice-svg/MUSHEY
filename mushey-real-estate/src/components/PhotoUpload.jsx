// src/components/PhotoUpload.jsx
// Small reusable image-upload control backed by Firebase Storage.
// Used for tenant ID photos and payment receipt photos.

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebaseConfig";
import "../styles/photoUpload.css";

export default function PhotoUpload({ storagePath, currentUrl, label, required, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl || "");

  const handleFile = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8MB.");
      return;
    }

    setUploading(true);
    try {
      const fileRef = ref(storage, `${storagePath}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setPreview(url);
      onUploaded(url);
    } catch (e) {
      setError("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photo-upload">
      <label className="photo-upload-label">
        {label}{required && <span className="photo-upload-required"> *</span>}
      </label>

      <div className="photo-upload-body">
        {preview && (
          <img src={preview} alt="" className="photo-upload-preview" />
        )}
        <label className="photo-upload-btn">
          {uploading ? "Uploading…" : preview ? "Replace Photo" : "Attach Photo"}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} hidden />
        </label>
      </div>

      {error && <div className="photo-upload-error">{error}</div>}
    </div>
  );
}

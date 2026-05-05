import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface PaymentUploadProps {
  orderId: number;
  orderDisplayId: string;
  onUploadSuccess: (imageUrl: string) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export const PaymentUpload: React.FC<PaymentUploadProps> = ({
  orderId,
  orderDisplayId,
  onUploadSuccess,
}) => {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a JPG or PNG image.";
    }
    if (file.size > MAX_SIZE) {
      return "File size exceeds 5MB limit.";
    }
    return null;
  };

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setState("error");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setState("uploading");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Upload failed");
      }

      const data = await response.json();
      setState("success");
      onUploadSuccess(data.image_url);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed. Please try again.");
      setState("error");
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setState("dragging");
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setState("idle");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRetry = () => {
    setState("idle");
    setErrorMessage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (state === "success") {
    return (
      <div className="payment-upload success-state">
        <div className="success-icon">&#10004;</div>
        <h3>Payment Under Review</h3>
        <p>Your bank slip has been uploaded successfully.</p>
        <p className="success-order-id">Order: {orderDisplayId}</p>
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Bank slip preview"
            className="preview-image"
          />
        )}
        <p className="success-note">
          We will verify your payment and update the order status shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="payment-upload">
      <h3>Upload Bank Slip</h3>
      <p className="upload-instruction">
        Upload a photo or scan of your bank receipt / slip to complete payment for order {orderDisplayId}
      </p>

      <div
        className={`upload-zone ${state === "dragging" ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        {state === "uploading" ? (
          <div className="uploading-indicator">
            <div className="spinner" />
            <p>Uploading...</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">&#128247;</div>
            <p className="upload-primary">Drag & drop your bank slip here</p>
            <p className="upload-secondary">or click to browse</p>
            <p className="upload-hint">JPG or PNG, max 5MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={handleInputChange}
          style={{ display: "none" }}
        />
      </div>

      {previewUrl && state !== "uploading" && (
        <div className="preview-section">
          <p>Preview:</p>
          <img src={previewUrl} alt="Preview" className="preview-image" />
        </div>
      )}

      {state === "error" && errorMessage && (
        <div className="error-banner" role="alert">
          <span>{errorMessage}</span>
          <button className="retry-btn" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
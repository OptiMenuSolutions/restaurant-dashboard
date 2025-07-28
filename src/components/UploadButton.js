// File: src/components/UploadButton.js
import React, { useRef } from "react";
import styles from "./UploadButton.module.css";

function UploadButton({ onUpload }) {
  const fileInputRef = useRef();

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && onUpload) {
      onUpload(file);
    }
  };

  return (
    <div className={styles.uploadWrapper}>
      <button className={styles.uploadButton} onClick={handleClick}>
        Upload Invoice
      </button>
      <input
        type="file"
        accept=".pdf, image/jpeg"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </div>
  );
}

export default UploadButton;


import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { validateFiles } from "@/lib/security";

interface FileUploadSectionProps {
  attachments: File[];
  setAttachments: (files: File[]) => void;
}

const FileUploadSection = ({ attachments, setAttachments }: FileUploadSectionProps) => {
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate files
      const validation = validateFiles(selectedFiles);
      
      if (!validation.isValid) {
        setErrors(validation.errors || []);
        // Clear the input
        e.target.value = '';
        return;
      }

      setErrors([]);
      setAttachments(selectedFiles.slice(0, 2)); // Limit to 2 files
    }
  };

  const allowedTypes = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.xls,.xlsx";
  const maxSizeMB = 25;

  return (
    <div className="space-y-2">
      <Label htmlFor="attachments">
        Attachments (up to 2 files, {maxSizeMB}MB max each)
      </Label>
      <Input
        id="attachments"
        type="file"
        multiple
        onChange={handleFileChange}
        accept={allowedTypes}
        className={errors.length > 0 ? "border-red-500" : ""}
      />
      
      <div className="text-xs text-muted-foreground">
        Formats autorisés: Images (JPG, PNG, GIF, WebP), Documents (PDF, TXT, DOC, DOCX, XLS, XLSX)
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">{error}</p>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">Fichiers sélectionnés:</div>
          {attachments.map((file, index) => (
            <div key={index} className="text-sm text-muted-foreground flex justify-between">
              <span>{file.name}</span>
              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadSection;

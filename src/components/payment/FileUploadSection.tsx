
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateFiles } from "@/lib/security";
import { X, File, Image, FileText } from "lucide-react";

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
      setAttachments(selectedFiles.slice(0, 5)); // Limit to 5 files
    }
  };

  const handleRemoveFile = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
    setErrors([]);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (fileType === 'application/pdf' || fileType === 'text/plain') {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const allowedTypes = ".jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx";
  const maxFileSizeMB = 10;
  const maxTotalSizeMB = 50;

  // Calculate total size
  const totalSizeMB = attachments.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="attachments" className="text-base font-medium">
          Attachments (Optional)
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Up to 5 files, {maxFileSizeMB}MB each, {maxTotalSizeMB}MB total
        </p>
      </div>

      <Input
        id="attachments"
        type="file"
        multiple
        onChange={handleFileChange}
        accept={allowedTypes}
        className={errors.length > 0 ? "border-red-500" : ""}
        disabled={attachments.length >= 5}
      />

      <div className="text-xs text-muted-foreground">
        Allowed formats: Images (JPG, PNG, GIF), Documents (PDF, TXT, DOC, DOCX)
      </div>

      {errors.length > 0 && (
        <div className="space-y-1 p-3 bg-red-50 border border-red-200 rounded-lg">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              {error}
            </p>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">
              Selected files ({attachments.length}/5)
            </div>
            <div className="text-xs text-muted-foreground">
              Total: {totalSizeMB.toFixed(2)} MB / {maxTotalSizeMB} MB
            </div>
          </div>

          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-gray-500">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadSection;


import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FileUploadSectionProps {
  attachments: File[];
  setAttachments: (files: File[]) => void;
}

const FileUploadSection = ({ attachments, setAttachments }: FileUploadSectionProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Limit to 2 attachments
      const selectedFiles = Array.from(e.target.files).slice(0, 2);
      setAttachments(selectedFiles);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="attachments">Attachments (up to 2 files)</Label>
      <Input
        id="attachments"
        type="file"
        multiple
        onChange={handleFileChange}
      />
      {attachments.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Selected files: {attachments.map(f => f.name).join(', ')}
        </div>
      )}
    </div>
  );
};

export default FileUploadSection;

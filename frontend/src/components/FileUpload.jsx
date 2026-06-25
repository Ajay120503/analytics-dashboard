import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileJson,
  File,
  FileType,
  Database,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadFile } from "../api/client";

const fileIcons = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  json: FileJson,
  pdf: FileText,
  txt: FileType,
  sql: Database,
};

const acceptedFormats = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/json": [".json"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/sql": [".sql"],
};

export default function FileUpload({ onSuccess }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      setUploading(true);
      try {
        const data = await uploadFile(formData);
        toast.success(`${file.name} analyzed successfully!`);
        onSuccess(data);
      } catch (err) {
        const message = err.response?.data?.detail || "Failed to process file";
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [onSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats,
    maxFiles: 1,
    disabled: uploading,
  });

  const getFileIcon = () => {
    return (
      <div className="relative">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Upload className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
          <File className="w-4 h-4 text-accent" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Upload any data file and get instant insights
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`
            relative p-12 rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-300 group
            ${
              isDragActive
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                : "border-gray-600 hover:border-primary/50 hover:bg-gray-800/30"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="text-center space-y-6">
            {getFileIcon()}

            <div>
              {isDragActive ? (
                <p className="text-xl font-semibold text-primary">
                  Drop your file here
                </p>
              ) : (
                <>
                  <p className="text-xl font-semibold text-gray-200 group-hover:text-primary transition-colors">
                    Drop a file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports CSV, Excel, JSON, PDF, TXT, SQL
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              {[
                { icon: FileSpreadsheet, label: "CSV" },
                { icon: FileSpreadsheet, label: "XLSX" },
                { icon: FileJson, label: "JSON" },
                { icon: FileText, label: "PDF" },
                { icon: FileType, label: "TXT" },
                { icon: Database, label: "SQL" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-400 text-xs"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {uploading && (
          <div className="mt-6">
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse w-full" />
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">
              Processing your file...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

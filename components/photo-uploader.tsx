"use client";

import type React from "react";

import { useState, useRef, useCallback } from "react";
import { Upload, Folder, X, ImageIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PhotoUploaderProps {
  username: string;
  uploadServerUrl?: string;
  onUploadComplete?: (paths: string[]) => void;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  folder: string;
  _file: File;
}

export function PhotoUploader({
  username,
  uploadServerUrl = "http://192.168.1.168:3001",
  onUploadComplete,
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [currentFolder, setCurrentFolder] = useState("folder_1");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<string[]>(["folder_1"]);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);

      const newFiles = selectedFiles.map((file) => {
        // Store the original file object
        const originalFile = file;
        // Create a new object with our custom properties
        return {
          ...originalFile,
          preview: URL.createObjectURL(file),
          id: `${file.name}-${Date.now()}`,
          status: "pending" as const,
          progress: 0,
          folder: currentFolder,
          // Store the original file for upload
          _file: originalFile,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);

      // Reset the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [currentFolder]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const updatedFiles = prev.filter((file) => file.id !== id);
      return updatedFiles;
    });
  }, []);

  const addFolder = useCallback(() => {
    if (newFolderName && !folders.includes(newFolderName)) {
      setFolders((prev) => [...prev, newFolderName]);
      setCurrentFolder(newFolderName);
      setNewFolderName("");
      setFolderDialogOpen(false);
    }
  }, [newFolderName, folders]);

  const uploadFiles = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completedFiles = 0;
    const uploadedPaths: string[] = [];

    // Update files status to uploading
    setFiles((prev) =>
      prev.map((file) => ({ ...file, status: "uploading" as const }))
    );

    for (const file of files) {
      try {
        const formData = new FormData();
        // Include username and folder in the file field name
        formData.append(`file`, file._file);
        // Add these as hidden fields and in the field name
        formData.append(
          "metadata",
          JSON.stringify({
            username,
            folder: file.folder,
          })
        );

        console.log("Uploading file:", {
          name: file._file.name,
          type: file._file.type,
          size: file._file.size,
          metadata: {
            username,
            folder: file.folder,
          },
        });

        const response = await fetch(`${uploadServerUrl}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        uploadedPaths.push(data.path);

        // Update individual file status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "success" as const, progress: 100 }
              : f
          )
        );

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      } catch (error) {
        console.error("Error uploading file:", error);

        // Update file status to error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error" as const } : f
          )
        );

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }
    }

    setIsUploading(false);

    if (onUploadComplete) {
      onUploadComplete(uploadedPaths);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Photo Uploader: {username}</h2>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {currentFolder}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder}
                  onClick={() => setCurrentFolder(folder)}
                  className={currentFolder === folder ? "bg-muted" : ""}
                >
                  {folder}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => setFolderDialogOpen(true)}>
                + Add new folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Folder</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
                <Button onClick={addFolder}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Add Files
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {file.preview ? (
                    <img
                      src={file.preview || "/placeholder.svg"}
                      alt={file._file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-1 right-1 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {file.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                  {file.status === "success" && (
                    <div className="absolute bottom-1 right-1 rounded-full bg-green-500 p-1 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <p className="text-xs truncate" title={file._file.name}>
                    {file._file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file._file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Folder: {file.folder}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </div>
            <Button
              onClick={uploadFiles}
              disabled={isUploading || files.length === 0}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload All
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <div className="mx-auto flex flex-col items-center justify-center gap-1">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-semibold">
              Drag photos here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground">
              Supports JPG, PNG and GIF files
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="mt-4"
            >
              Select Files
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

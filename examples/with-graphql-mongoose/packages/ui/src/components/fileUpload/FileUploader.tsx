'use client';

import React from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { type DocumentModel } from '@repo/schemas/src/index';
// eslint-disable-next-line import/no-extraneous-dependencies
import { UploadIcon } from '../../icons';
import { Button } from '@/src/atoms';
import { cn } from '../../utils/cn';
import useFileUploader from '../../hooks/useFileUploader';
import FileItem from './FileItem';

interface FileUploaderProps {
  acceptedFiles?: Accept;
  maximumFiles?: number;
  maximumSize?: number;
  btn?: {
    text: string;
    className: string;
  };
  hasDropzone?: boolean;
  showFileThumbnail?: boolean;
  files: DocumentModel[];
  setFiles: React.Dispatch<React.SetStateAction<DocumentModel[]>>;
}

export default function FileUploader({
  acceptedFiles = {
    'image/*': ['.png', '.jpg', '.jpeg', '.pdf', '.svg'],
  },
  maximumFiles = 5,
  maximumSize = 5242880,
  btn = { text: 'Subir archivos', className: '' },
  hasDropzone = false,
  showFileThumbnail = false,
  files,
  setFiles,
}: FileUploaderProps) {
  const { handleRemoveFile, handleFileUpload } = useFileUploader({
    maximumFiles,
    maximumSize,
    files,
    setFiles,
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: acceptedFiles,
    maxFiles: maximumFiles,
    maxSize: maximumSize,
  });

  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="w-full flex flex-col flex-wrap  p-10 gap-4 bg-white">
      {hasDropzone && (
        <div
          data-testid="file-dropzone"
          className={`flex flex-col cursor-pointer justify-center items-center rounded-xl text-black border border-neutral-300 border-solid py-4 px-6 ${isDragActive
              ? 'bg-gray-200 border-neutral-800'
              : 'bg-gray-100 bordery-gray-300'
            }`}
          {...getRootProps()}
        >
          <div className="rounded-lg text-sm bg-white border border-neutral-200 shadow-sm p-2 hover:bg-neutral-50 ease transition duration-300 mb-3">
            <UploadIcon className="w-5 h-5" />
          </div>
          {isDragActive ? (
            <p className="text-center">Suelta los archivos aquí </p>
          ) : (
            <>
              <p className="text-center text-sm mb-1">
                <strong className="font-bold text-primary-200">
                  {`Subir archivo `}
                </strong>
                | arrastra y suelta
              </p>
              <p className="text-xs text-center">
                PDF, SVG, PNG o JPG (max. 800x400px)
              </p>
            </>
          )}
        </div>
      )}
      <input {...getInputProps()} ref={inputRef} />
      <Button
        // Se deja el className por defecto o se puede pasar uno personalizado
        className={cn(
          'bg-rose-500 hover:bg-rose-400 text-white font-bold py-2 px-4 rounded',
          btn?.className
        )}
        onClick={() => inputRef?.current?.click()}
      >
        {btn?.text}
      </Button>
      <div className="flex flex-wrap gap-4">
        {files.map((file, idx) => (
          <FileItem
            key={idx}
            item={file}
            onRemove={handleRemoveFile}
            updateSrc={setFiles}
            showFileThumbnail={showFileThumbnail}
          />
        ))}
      </div>
    </div>
  );
}

import { DocumentModel } from '@repo/schemas/src/index';
import React from 'react';

type FileUploaderProps = {
  maximumFiles: number;
  maximumSize: number;
  files: DocumentModel[];
  setFiles: React.Dispatch<React.SetStateAction<DocumentModel[]>>;
};

export default function useFileUploader({
  maximumFiles,
  maximumSize,
  files,
  setFiles,
}: FileUploaderProps) {
  function handleFileUpload(acceptedFiles: File[]) {
    // Se chequea si el numero de archivos seleccionados es mayor al maximo permitido
    if (acceptedFiles && files.length + acceptedFiles.length > maximumFiles) {
      // TODO: Agregar mensaje de error
      return;
    }

    // Se filtran los archivos que sean menores a 1MB
    const filteredFiles = Array.from(acceptedFiles).filter(
      (file) => file.size <= maximumSize
    );

    // TODO: Indicar que archivos no se subieron por ser mayores a 1MB

    const _notValidFiles = Array.from(acceptedFiles).filter(
      (file) => !filteredFiles.includes(file)
    );

    // Se agregan los archivos al estado

    setFiles((prev) => [
      ...prev,
      ...filteredFiles.map((file) => ({
        file,
        id: crypto.randomUUID(),
        src: URL.createObjectURL(file),
        name: file.name,
      })),
    ]);
  }

  const handleRemoveFile = (file: DocumentModel) => {
    setFiles(files.filter((f) => f.id !== file.id));
  };

  return {
    files,
    setFiles,
    handleFileUpload,
    handleRemoveFile,
  };
}

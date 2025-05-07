'use client';

import { type DocumentModel } from '@repo/schemas/src/index';
import React from 'react';
// import useS3Signature from 'client/src/hooks/use-s3-signature';
import { PDFIcon, PageIcon, TrashIcon } from '../../icons';

interface FileItemProps {
  item: DocumentModel;
  onRemove: (file: DocumentModel) => void;
  updateSrc?: React.Dispatch<React.SetStateAction<DocumentModel[]>>;
  showFileThumbnail?: boolean;
}

export default function FileItem({
  item,
  onRemove,
  updateSrc,
  showFileThumbnail = false,
}: FileItemProps) {
  const [isImageFile] = React.useState<boolean | undefined>(
    item?.file?.type.startsWith('image/')
  );
  const isPDF = React.useMemo(() => item?.file?.type.includes('pdf'), [item]);

  // const { uploading } = useS3Signature({ item, updateSrc });
  const uploading = false;

  return (
    <div className={`flex ${uploading ? 'opacity-25' : 'opacity-100'}`}>
      {/* Si se quiere ver la previa del archivo se controla con `showFileThumbnail` */}
      <div
        className="bg-neutral-50 max-h-[72px] border border-background-400 flex w-full justify-between rounded-lg items-center p-4 gap-2"
        title={item?.name}
      >
        <a
          target="_blank"
          className="flex text-sm gap-x-2"
          rel="noopener noreferrer"
          href={item?.src as string}
        >
          {/* Si el archivo es de tipo `image/*` se muestra con img, de lo contrario se usa un icono generico  */}
          {showFileThumbnail && isImageFile && (
            <picture className="size-12">
              <img
                src={item?.src as string}
                alt={item?.name}
                loading="lazy"
                className="rounded-lg size-full"
                width={50}
                height={50}
              />
            </picture>
          )}
          {isPDF && <PDFIcon className="size-10" />}
          {!isImageFile && !isPDF && <PageIcon className="size-10" />}
          <p className="text-sm line-clamp-2 w-20 text-black">{item?.name}</p>
        </a>
        <button
          type="button"
          onClick={() => onRemove(item)}
          title={`Eliminar ${item?.name}`}
        >
          {' '}
          <TrashIcon className="size-5 hover:scale-125 transition-transform ease text-rose-500/70 hover:text-rose-500" />
        </button>
      </div>
    </div>
  );
}

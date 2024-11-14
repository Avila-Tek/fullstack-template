'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import ClientOnlyPortal from '../portal/Portal';

interface BackdropProps {
  children: React.ReactNode;
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  blockScroll?: boolean;
  canClose?: boolean;
  selector?: string;
}

export default function Backdrop({
  children,
  show,
  setShow,
  blockScroll = true,
  canClose = true,
  selector = 'backdrop',
}: BackdropProps) {
  const closeHandler = React.useCallback(() => {
    if (!canClose) return;
    if (blockScroll) document.body.classList.remove('overflow-hidden');
    setShow(false);
  }, [blockScroll, setShow, canClose]);

  React.useEffect(() => {
    if (show) {
      document.body.classList.add('overflow-hidden');
    }
  }, [show]);

  return (
    <ClientOnlyPortal selector={`#${selector}`}>
      <AnimatePresence>
        {show && (
          <>
            <motion.div
              key={`${selector}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              role="presentation"
              id={`${selector}`}
              className={`top-0 left-0 fixed z-40 h-screen w-screen ${cn(
                'opacity-60 bg-black'
              )}`}
            />
            <motion.div
              key={`${selector}-content`}
              initial={{ opacity: 0, top: 100 }}
              animate={{ opacity: 1, top: 0 }}
              exit={{ opacity: 0, top: 100 }}
              role="presentation"
              id={`${selector}-content`}
              className="z-50 w-screen h-screen fixed flex justify-center items-center top-0 left-0"
              onClick={closeHandler}
            >
              <div
                className="relative opacity-100"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
                key={`${selector}-content-bg`}
              >
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ClientOnlyPortal>
  );
}

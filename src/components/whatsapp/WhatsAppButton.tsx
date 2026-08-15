'use client';

import React, { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/Button';
import { WhatsAppPreviewModal } from '@/components/modals/WhatsAppPreviewModal';
import { MessageSquare } from 'lucide-react';

export interface WhatsAppButtonProps extends Omit<ButtonProps, 'onClick'> {
  phone: string;
  message: string;
  modalTitle?: string;
  directLink?: boolean;
}

export function WhatsAppButton({
  phone,
  message,
  modalTitle,
  directLink = false,
  children,
  size = 'sm',
  variant = 'success',
  ...props
}: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (directLink) {
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<MessageSquare className="w-4 h-4" />}
        {...props}
      >
        {children || 'WhatsApp'}
      </Button>

      {!directLink && (
        <WhatsAppPreviewModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          phone={phone}
          defaultMessage={message}
          title={modalTitle}
        />
      )}
    </>
  );
}

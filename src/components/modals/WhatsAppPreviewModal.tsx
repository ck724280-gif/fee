'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { Copy, Check, MessageSquare } from 'lucide-react';

export interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  defaultMessage: string;
  title?: string;
}

export function WhatsAppPreviewModal({
  isOpen,
  onClose,
  phone,
  defaultMessage,
  title = 'WhatsApp Click-to-Chat Preview',
}: WhatsAppPreviewModalProps) {
  const [recipientPhone, setRecipientPhone] = useState(phone);
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setRecipientPhone(phone);
    setMessage(defaultMessage);
    setCopied(false);
  }, [phone, defaultMessage, isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = () => {
    const url = buildWhatsAppUrl(recipientPhone, message);
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Review and customize message before opening WhatsApp Click-to-Chat"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <Input
          label="Recipient WhatsApp Number"
          placeholder="9876543210"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
        />

        <Textarea
          label="Pre-filled Message Body"
          rows={10}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="font-mono text-xs leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied to Clipboard' : 'Copy Text'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleOpenWhatsApp}
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Open in WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

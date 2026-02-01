import React from 'react';
import { Stethoscope, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PairInfoDialogProps {
  open: boolean;
  onClose: () => void;
  pairCode: string;
  type: 'symptoms' | 'recommendations';
  content: string;
}

export function PairInfoDialog({ open, onClose, pairCode, type, content }: PairInfoDialogProps) {
  const isSymptoms = type === 'symptoms';
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSymptoms ? (
              <Stethoscope className="w-5 h-5 text-primary" />
            ) : (
              <Lightbulb className="w-5 h-5 text-warning" />
            )}
            {isSymptoms ? 'Sintomatología' : 'Recomendaciones'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{pairCode}</Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 bg-muted/30 rounded-lg">
            {content ? (
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {isSymptoms 
                  ? 'No hay sintomatología registrada para este par.'
                  : 'No hay recomendaciones registradas para este par.'
                }
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

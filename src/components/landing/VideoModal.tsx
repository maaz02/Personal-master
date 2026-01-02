import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOOM_EMBED_URL } from "@/lib/constants";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoModal({ isOpen, onClose }: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-foreground">
        <VisuallyHidden>
          <DialogTitle>Product Demo Video</DialogTitle>
        </VisuallyHidden>
        <div className="aspect-video">
          <iframe
            src={LOOM_EMBED_URL}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

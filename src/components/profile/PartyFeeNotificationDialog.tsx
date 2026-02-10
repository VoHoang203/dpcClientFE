import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PartyFeeNotificationDialogProps {
  open: boolean;
  onClose: () => void;
}

const PartyFeeNotificationDialog = ({
  open,
  onClose,
}: PartyFeeNotificationDialogProps) => {
  const handleConfirm = () => {
    toast.success("Đã bật thông báo đảng phí");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bật thông báo đảng phí</DialogTitle>
          <DialogDescription>
            Bạn sẽ nhận được nhắc nhở đóng đảng phí hàng tháng.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleConfirm}>Bật thông báo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartyFeeNotificationDialog;

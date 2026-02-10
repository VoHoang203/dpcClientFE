import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BanConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  isBanned: boolean;
  onConfirm: () => void;
}

const BanConfirmDialog = ({
  open,
  onOpenChange,
  accountName,
  isBanned,
  onConfirm,
}: BanConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn{" "}
            <span className="font-semibold text-foreground">
              {isBanned ? "mở khóa" : "khóa"}
            </span>{" "}
            tài khoản{" "}
            <span className="font-semibold text-foreground">{accountName}</span>?
            {!isBanned && " Người dùng sẽ không thể đăng nhập sau khi bị khóa."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              isBanned
                ? ""
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
          >
            {isBanned ? "Mở khóa" : "Khóa tài khoản"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BanConfirmDialog;

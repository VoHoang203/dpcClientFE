"use client";

import { useState } from "react";
import { Upload, FileText, X, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
}

const TransferDialog = ({ open, onClose }: TransferDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file || !destination) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ thông tin và đính kèm file",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Đã gửi hồ sơ chuyển đảng",
      description: "Hồ sơ của bạn đã được gửi lên Chi ủy để xem xét",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Viết hồ sơ chuyển Đảng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Chi bộ/Đảng bộ tiếp nhận *</Label>
            <Input
              id="destination"
              placeholder="VD: Chi bộ số 2 - Đảng bộ Công ty ABC"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Lý do chuyển đảng</Label>
            <Textarea
              id="reason"
              placeholder="Nêu lý do xin chuyển sinh hoạt đảng..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>File đơn xin chuyển đảng *</Label>
            <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
              {file ? (
                <div className="flex items-center justify-between rounded bg-muted p-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    Kéo thả file hoặc click để chọn
                  </p>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="mx-auto max-w-xs"
                  />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Chấp nhận file PDF, DOC, DOCX. Tối đa 10MB.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Hủy
          </Button>
          <Button className="flex-1 gap-2" onClick={handleSubmit}>
            <Send className="h-4 w-4" />
            Gửi hồ sơ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;

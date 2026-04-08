"use client";

import { useEffect, useState } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  year: number;
  initialCriteria: string[];
  onClose: () => void;
  onSubmit: (criteriaTemplate: string[]) => Promise<void>;
};

export default function ClassificationCriteriaConfigDialog({
  open,
  year,
  initialCriteria,
  onClose,
  onSubmit,
}: Props) {
  const [rows, setRows] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const seed =
      initialCriteria.length > 0 ? [...initialCriteria] : [""];
    setRows(seed);
  }, [open, initialCriteria]);

  const handleSave = async () => {
    const cleaned = rows.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast({ title: "Thiếu chỉ tiêu", description: "Nhập ít nhất một chỉ tiêu" });
      return;
    }
    setSaving(true);
    try {
      await onSubmit(cleaned);
      onClose();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không lưu được bộ tiêu chí";
      toast({ title: "Lỗi", description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Bộ tiêu chí đánh giá — năm {year}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Thêm hoặc chỉnh sửa các chỉ tiêu cho đảng viên trong năm này. Lưu sẽ
          tạo/cập nhật cấu hình trên hệ thống.
        </p>
        <div className="space-y-2">
          <Label>Danh sách chỉ tiêu</Label>
          {rows.map((row, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={row}
                placeholder={`Chỉ tiêu ${idx + 1}`}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = e.target.value;
                  setRows(next);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Xóa dòng"
                disabled={rows.length <= 1}
                onClick={() =>
                  setRows((r) => r.filter((_, i) => i !== idx))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={() => setRows((r) => [...r, ""])}
          >
            <Plus className="h-4 w-4" />
            Thêm chỉ tiêu
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu bộ tiêu chí"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

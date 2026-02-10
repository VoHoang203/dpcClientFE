"use client";

import { useState } from "react";
import { FileText, Upload, Send, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function AdmissionApplicationPage() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Đã gửi hồ sơ",
      description: "Hồ sơ xin kết nạp đã được gửi lên Chi ủy để xem xét",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <FileText className="h-6 w-6 text-primary" />
          Xin làm Đảng viên
        </h1>
        <p className="text-muted-foreground">Nộp hồ sơ xin kết nạp Đảng</p>
      </div>

      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">
                Quy trình kết nạp Đảng viên
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700">
                <li>QCUT nộp hồ sơ (bước hiện tại)</li>
                <li>Chi ủy kiểm tra và nhận xét hồ sơ</li>
                <li>Phó Bí thư duyệt nội dung</li>
                <li>QCUT đi xác minh lý lịch</li>
                <li>Phó Bí thư kiểm tra dấu đỏ và chốt</li>
                <li>Chi ủy soạn Nghị quyết</li>
                <li>Bí thư duyệt Nghị quyết</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên *</Label>
                <Input id="fullName" placeholder="Nguyễn Văn A" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Ngày sinh *</Label>
                <Input id="dob" type="date" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input id="phone" placeholder="0912345678" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ thường trú *</Label>
              <Input
                id="address"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lý do xin vào Đảng</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Trình bày lý do bạn muốn được kết nạp vào Đảng Cộng sản Việt Nam..."
              rows={6}
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hồ sơ đính kèm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                Kéo thả file hoặc click để chọn
              </p>
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="mx-auto max-w-xs"
                accept=".pdf,.doc,.docx,.jpg,.png"
              />
            </div>
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">File đã chọn:</p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-xs">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              <p className="mb-1 font-medium">Các giấy tờ cần nộp:</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>Đơn xin vào Đảng</li>
                <li>Lý lịch của người xin vào Đảng</li>
                <li>Giấy giới thiệu của đảng viên chính thức (02 người)</li>
                <li>Nghị quyết giới thiệu đoàn viên của Chi đoàn</li>
                <li>Các giấy tờ khác (nếu có)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full gap-2">
          <Send className="h-4 w-4" />
          Gửi hồ sơ
        </Button>
      </form>
    </div>
  );
}

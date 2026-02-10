"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const ScheduleMeeting = () => {
  const [meetingType, setMeetingType] = useState<
    "meeting" | "ceremony" | "celebration" | "wedding" | "funeral" | "event"
  >("meeting");
  const [isOnline, setIsOnline] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(["all"]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-3xl px-4 py-5">
        <Link
          href="/calendar"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Sắp lịch mới</h1>
          <p className="text-muted-foreground">Tạo cuộc họp hoặc sự kiện</p>
        </div>

        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loại lịch</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={meetingType}
                onValueChange={(value) =>
                  setMeetingType(
                    value as
                      | "meeting"
                      | "ceremony"
                      | "celebration"
                      | "wedding"
                      | "funeral"
                      | "event"
                  )
                }
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="meeting"
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    meetingType === "meeting"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value="meeting" id="meeting" />
                  <div>
                    <p className="font-medium">Cuộc họp</p>
                    <p className="text-sm text-muted-foreground">
                      Họp Chi bộ, họp định kỳ
                    </p>
                  </div>
                </Label>
                <Label
                  htmlFor="event"
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    meetingType === "event"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value="event" id="event" />
                  <div>
                    <p className="font-medium">Sự kiện</p>
                    <p className="text-sm text-muted-foreground">
                      Đám cưới, đám ma, lễ hội
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input id="title" placeholder="VD: Họp Chi bộ tháng 1/2025" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Nội dung, mục đích cuộc họp/sự kiện..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Ngày *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="date" type="date" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Thời gian *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="time" type="time" className="pl-10" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Thời lượng (phút)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="120"
                  defaultValue={120}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Địa điểm</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="online-toggle" className="text-sm font-normal">
                    Họp online
                  </Label>
                  <Switch
                    id="online-toggle"
                    checked={isOnline}
                    onCheckedChange={setIsOnline}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isOnline ? (
                <div className="space-y-2">
                  <Label htmlFor="meet-link">Link Google Meet</Label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="meet-link"
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Tạo link Meet mới
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="location">Địa chỉ</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="VD: Hội trường A, 123 Nguyễn Trãi, Hà Nội"
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Người tham dự
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge
                  variant={selectedMembers.includes("all") ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedMembers(["all"])}
                >
                  Tất cả Đảng viên
                </Badge>
                <Badge
                  variant={
                    selectedMembers.includes("leaders") ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => setSelectedMembers(["leaders"])}
                >
                  Ban Chấp hành
                </Badge>
                <Badge
                  variant={
                    selectedMembers.includes("custom") ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => setSelectedMembers(["custom"])}
                >
                  Tùy chọn
                </Badge>
              </div>
              {selectedMembers.includes("custom") && (
                <Input placeholder="Tìm kiếm đảng viên..." />
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                48 người sẽ nhận được thông báo
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" asChild>
              <Link href="/calendar">Hủy</Link>
            </Button>
            <Button type="submit" className="flex-1">
              Tạo lịch
            </Button>
          </div>
        </form>
      </main>
      <BottomNav />
    </div>
  );
};

export default ScheduleMeeting;

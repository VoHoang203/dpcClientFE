"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Award, FileSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fileService } from "@/services/fileService";
import {
  commendationService,
  type CommendationItem,
} from "@/services/commendationService";
import { disciplineService, type DisciplineItem } from "@/services/disciplineService";

function sortByDateDesc<T extends { date: string }>(a: T, b: T) {
  return String(b.date || "").localeCompare(String(a.date || ""));
}

export default function RewardsPenaltiesPage() {
  const { isReady, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [commendations, setCommendations] = useState<CommendationItem[]>([]);
  const [disciplines, setDisciplines] = useState<DisciplineItem[]>([]);

  const totals = useMemo(() => {
    return {
      commendations: commendations.length,
      disciplines: disciplines.length,
    };
  }, [commendations.length, disciplines.length]);

  const load = async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        commendationService.myCommendations(),
        disciplineService.myDisciplines(),
      ]);
      setCommendations([...c].sort(sortByDateDesc));
      setDisciplines([...d].sort(sortByDateDesc));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải được hồ sơ thi đua - kỷ luật");
      setCommendations([]);
      setDisciplines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user?.userId]);

  if (isReady && !user) {
    return (
      <div className="p-6">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Bạn chưa đăng nhập</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vui lòng đăng nhập để xem hồ sơ thi đua - kỷ luật của bạn.
          </CardContent>
        </Card>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hồ sơ Thi đua - Kỷ luật</h1>
            <p className="text-muted-foreground">
              Danh sách khen thưởng và kỷ luật của cá nhân bạn
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Khen thưởng</CardTitle>
              <Award className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{totals.commendations}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Kỷ luật</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{totals.disciplines}</CardContent>
          </Card>
        </div>

        <Tabs defaultValue="commendations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="commendations">Khen thưởng</TabsTrigger>
            <TabsTrigger value="disciplines">Kỷ luật</TabsTrigger>
          </TabsList>

          <TabsContent value="commendations" className="mt-4 space-y-3">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">Đang tải...</CardContent>
              </Card>
            ) : commendations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Chưa có khen thưởng.
                </CardContent>
              </Card>
            ) : (
              commendations.map((it) => (
                <Card key={it.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{it.title}</Badge>
                          <span className="text-xs text-muted-foreground">{it.date}</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Số QĐ: <span className="font-mono text-foreground">{it.decisionNumber}</span>
                          <span className="mx-2">•</span>
                          Cấp ký: <span className="text-foreground">{it.signingAuthority}</span>
                        </div>
                        {it.description ? (
                          <div className="mt-2 text-sm">{it.description}</div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() =>
                            fileService.openInNewTab(String(it.fileUrl ?? ""))
                          }
                          disabled={!it.fileUrl?.trim()}
                        >
                          <FileSearch className="h-4 w-4" />
                          Xem file
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="disciplines" className="mt-4 space-y-3">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">Đang tải...</CardContent>
              </Card>
            ) : disciplines.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Chưa có kỷ luật.
                </CardContent>
              </Card>
            ) : (
              disciplines.map((it) => (
                <Card key={it.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-destructive text-destructive"
                          >
                            {it.form}
                          </Badge>
                          {it.status ? (
                            <Badge variant="outline">{it.status}</Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">{it.date}</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Số QĐ: <span className="font-mono text-foreground">{it.decisionNumber}</span>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Lý do:</span>{" "}
                          <span className="text-foreground">{it.reason}</span>
                        </div>
                        {it.description ? (
                          <div className="mt-2 text-sm">{it.description}</div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() =>
                            fileService.openInNewTab(String(it.fileUrl ?? ""))
                          }
                          disabled={!it.fileUrl?.trim()}
                        >
                          <FileSearch className="h-4 w-4" />
                          Xem file
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}


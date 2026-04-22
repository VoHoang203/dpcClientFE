"use client";

import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetchJson = (url: string) => fetch(url).then((r) => r.json());

export type VietnamAddressValue = {
  streetAddress: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
};

type Props = {
  value: VietnamAddressValue;
  onChange: (next: VietnamAddressValue) => void;
  /** Chuỗi địa chỉ đầy đủ ghép từ số nhà + phường + quận + tỉnh (để PATCH `permanentAddress`). */
  onCompositeChange?: (full: string) => void;
  disabled?: boolean;
};

export function buildCompositeAddress(
  value: VietnamAddressValue,
  provinces: unknown,
  districtsData: unknown,
  wardsData: unknown,
): string {
  const parts: string[] = [];
  if (value.streetAddress.trim()) parts.push(value.streetAddress.trim());
  const wards = (wardsData as { wards?: { code: number | string; name: string }[] })
    ?.wards;
  if (value.wardCode && wards) {
    const w = wards.find((x) => String(x.code) === value.wardCode);
    if (w) parts.push(w.name);
  }
  const districts = (
    districtsData as { districts?: { code: number | string; name: string }[] }
  )?.districts;
  if (value.districtCode && districts) {
    const d = districts.find((x) => String(x.code) === value.districtCode);
    if (d) parts.push(d.name);
  }
  const plist = provinces as { code: number | string; name: string }[] | undefined;
  if (value.provinceCode && plist) {
    const p = plist.find((x) => String(x.code) === value.provinceCode);
    if (p) parts.push(p.name);
  }
  return parts.join(", ");
}

export function VietnamAddressFields({
  value,
  onChange,
  onCompositeChange,
  disabled,
}: Props) {
  const { data: provinces } = useSWR(
    "vn-provinces",
    () => fetchJson("https://provinces.open-api.vn/api/p/"),
    { revalidateOnFocus: false },
  );
  const { data: districtsData } = useSWR(
    value.provinceCode
      ? `vn-districts-${value.provinceCode}`
      : null,
    () =>
      fetchJson(
        `https://provinces.open-api.vn/api/p/${value.provinceCode}?depth=2`,
      ),
    { revalidateOnFocus: false },
  );
  const { data: wardsData } = useSWR(
    value.districtCode ? `vn-wards-${value.districtCode}` : null,
    () =>
      fetchJson(
        `https://provinces.open-api.vn/api/d/${value.districtCode}?depth=2`,
      ),
    { revalidateOnFocus: false },
  );

  const preview = useMemo(
    () => buildCompositeAddress(value, provinces, districtsData, wardsData),
    [value, provinces, districtsData, wardsData],
  );

  useEffect(() => {
    onCompositeChange?.(preview);
  }, [preview, onCompositeChange]);

  const set = (patch: Partial<VietnamAddressValue>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Tỉnh / Thành phố</Label>
        <Select
          value={value.provinceCode || undefined}
          onValueChange={(v) =>
            set({
              provinceCode: v,
              districtCode: "",
              wardCode: "",
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn tỉnh / thành" />
          </SelectTrigger>
          <SelectContent>
            {(provinces as { code: number; name: string }[] | undefined)?.map(
              (p) => (
                <SelectItem key={p.code} value={String(p.code)}>
                  {p.name}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quận / Huyện</Label>
        <Select
          value={value.districtCode || undefined}
          onValueChange={(v) => set({ districtCode: v, wardCode: "" })}
          disabled={disabled || !value.provinceCode}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn quận / huyện" />
          </SelectTrigger>
          <SelectContent>
            {(
              districtsData as
                | { districts?: { code: number; name: string }[] }
                | undefined
            )?.districts?.map((d) => (
              <SelectItem key={d.code} value={String(d.code)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Phường / Xã</Label>
        <Select
          value={value.wardCode || undefined}
          onValueChange={(v) => set({ wardCode: v })}
          disabled={disabled || !value.districtCode}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn phường / xã" />
          </SelectTrigger>
          <SelectContent>
            {(
              wardsData as { wards?: { code: number; name: string }[] } | undefined
            )?.wards?.map((w) => (
              <SelectItem key={w.code} value={String(w.code)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Số nhà, đường</Label>
        <Input
          value={value.streetAddress}
          onChange={(e) => set({ streetAddress: e.target.value })}
          placeholder="Số nhà, tên đường"
          disabled={disabled}
        />
      </div>
      {preview.trim() ? (
        <p className="text-xs text-muted-foreground">
          Địa chỉ đầy đủ: <span className="font-medium text-foreground">{preview}</span>
        </p>
      ) : null}
    </div>
  );
}

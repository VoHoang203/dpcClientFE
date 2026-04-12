"use client";

import { useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Link2Off,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Minus,
  Highlighter,
  RemoveFormatting,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HandbookAudio, HandbookVideo } from "@/components/handbook/tiptap-extensions";

// THÊM 2 IMPORT NÀY VÀO
import { fileService } from "@/services/fileService";
import { getDeployAPI } from "@/lib/apiEnv";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/*,video/*,audio/*";

// ĐÃ SỬA LẠI HÀM NÀY ĐỂ GỌI API BACKEND THAY VÌ GỌI API FRONTEND
async function uploadHandbookMedia(file: File): Promise<string> {
  try {
    // 1. Gọi api POST /file/upload thông qua fileService
    const response = await fileService.uploadFile(file);

    // 2. Lấy objectName từ response
    // Tuỳ thuộc vào cách backend bọc dữ liệu, ta bắt các trường hợp hay gặp
    const objectName = response?.data?.objectName || response?.objectName || response?.data?.data?.objectName;

    if (!objectName) {
      throw new Error("Không lấy được tên file từ server. Kiểm tra lại response của API upload.");
    }

    // 3. Ghép thành URL GET /file/view
    const baseUrl = getDeployAPI();
    return `${baseUrl}/file/view?objectName=${objectName}`;

  } catch (error: any) {
    console.error("Upload media error:", error);
    throw new Error(error.message || "Tải file thất bại");
  }
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function HandbookRichEditor({
  value,
  onChange,
  placeholder = "Soạn nội dung như bài báo: chữ đậm, nghiêng, tiêu đề, danh sách, căn lề, chèn link và tệp ảnh / âm thanh / video (tối đa 5MB mỗi file).",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
          link: {
            openOnClick: false,
            HTMLAttributes: {
              class: "text-primary underline underline-offset-2",
            },
          },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Image.configure({
          HTMLAttributes: {
            class: "my-4 max-h-[480px] w-auto max-w-full rounded-lg border border-border object-contain",
          },
        }),
        HandbookVideo,
        HandbookAudio,
        Placeholder.configure({
          placeholder,
        }),
      ],
      content: value || "<p></p>",
      editorProps: {
        attributes: {
          class:
            "prose prose-lg max-w-none dark:prose-invert focus:outline-none min-h-[420px] px-4 py-4 [&_video]:max-w-full [&_audio]:w-full",
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
    },
    []
  );

  const pickMedia = useCallback(() => fileRef.current?.click(), []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !editor) return;
      if (file.size > MAX_BYTES) {
        toast.error("File quá lớn", { description: "Mỗi file không được vượt quá 5MB." });
        return;
      }
      try {
        const url = await uploadHandbookMedia(file);
        const type = file.type;
        if (type.startsWith("image/")) {
          editor.chain().focus().setImage({ src: url }).run();
        } else if (type.startsWith("video/")) {
          editor
            .chain()
            .focus()
            .insertContent({ type: "handbookVideo", attrs: { src: url } })
            .run();
        } else if (type.startsWith("audio/")) {
          editor
            .chain()
            .focus()
            .insertContent({ type: "handbookAudio", attrs: { src: url } })
            .run();
        } else {
          toast.error("Định dạng không hỗ trợ", {
            description: "Chỉ dùng ảnh, video hoặc âm thanh.",
          });
        }
      } catch (err) {
        toast.error("Không tải được file", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [editor]
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Địa chỉ liên kết (URL):", prev || "https://");
    if (url === null) return;
    const t = url.trim();
    if (t === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: t }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[420px] animate-pulse rounded-xl border border-border bg-muted/40" />
    );
  }

  const blockLabel = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : editor.isActive("heading", { level: 4 })
        ? "h4"
        : "p";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-2">
        <Select
          value={blockLabel}
          onValueChange={(v) => {
            const chain = editor.chain().focus();
            if (v === "p") chain.setParagraph().run();
            if (v === "h2") chain.toggleHeading({ level: 2 }).run();
            if (v === "h3") chain.toggleHeading({ level: 3 }).run();
            if (v === "h4") chain.toggleHeading({ level: 4 }).run();
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Đoạn / tiêu đề" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Đoạn văn</SelectItem>
            <SelectItem value="h2">Tiêu đề 2</SelectItem>
            <SelectItem value="h3">Tiêu đề 3</SelectItem>
            <SelectItem value="h4">Tiêu đề 4</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-7" />

        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Đậm"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Nghiêng"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("underline") ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Gạch chân"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("strike") ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Gạch ngang"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("code") ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleCode().run()}
          aria-label="Code"
        >
          <Code className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive("highlight") ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          aria-label="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </Button>

        <input
          type="color"
          className="h-8 w-8 cursor-pointer overflow-hidden rounded border border-border p-0"
          title="Màu chữ"
          onChange={(ev) => {
            editor.chain().focus().setColor(ev.target.value).run();
          }}
        />

        <Separator orientation="vertical" className="mx-1 h-7" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          aria-label="Căn trái"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          aria-label="Căn giữa"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          aria-label="Căn phải"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          aria-label="Căn đều"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-7" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Danh sách"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Danh sách số"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Trích dẫn"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          aria-label="Đường kẻ ngang"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-7" />

        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={setLink} aria-label="Chèn link">
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().unsetLink().run()}
          aria-label="Bỏ link"
        >
          <Link2Off className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-7" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={pickMedia}
          title="Ảnh, video hoặc âm thanh (≤ 5MB)"
          aria-label="Chèn ảnh, video hoặc âm thanh"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onFile} />

        <Separator orientation="vertical" className="mx-1 h-7" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Hoàn tác"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Làm lại"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetAllMarks()
              .unsetHighlight()
              .unsetTextAlign()
              .run()
          }
          title="Xóa định dạng tại vị trí con trỏ"
          aria-label="Xóa định dạng"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent editor={editor} className="bg-card" />

      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Gợi ý: chọn đoạn/tiêu đề, dùng thanh công cụ để định dạng; chèn ảnh / video / âm thanh từ máy (mỗi file ≤ 5MB). Nội dung được lưu dạng HTML hiển thị đúng trên trang đọc bài.
      </p>
    </div>
  );
}
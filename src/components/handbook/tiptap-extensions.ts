import { Node, mergeAttributes } from "@tiptap/core";

export const HandbookVideo = Node.create({
  name: "handbookVideo",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "video[src]",
        getAttrs: (el) => {
          const src = (el as HTMLElement).getAttribute("src");
          return src ? { src } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        "data-handbook-video": "",
        controls: true,
        class: "my-4 w-full max-w-3xl rounded-lg border border-border bg-black/5",
      }),
    ];
  },
});

export const HandbookAudio = Node.create({
  name: "handbookAudio",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "audio[src]",
        getAttrs: (el) => {
          const src = (el as HTMLElement).getAttribute("src");
          return src ? { src } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "audio",
      mergeAttributes(HTMLAttributes, {
        "data-handbook-audio": "",
        controls: true,
        class: "my-4 w-full max-w-xl",
      }),
    ];
  },
});

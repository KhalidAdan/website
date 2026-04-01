import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { ListenerManager } from "@milkdown/kit/plugin/listener";
import { useEffect, useRef } from "react";
import type { LanguageDescription } from "@codemirror/language";
import { EditorView } from "@codemirror/view";

const SUPPORTED_LANGUAGE_NAMES = [
  "javascript", "typescript", "python", "html", "css", "json",
  "markdown", "bash", "rust", "go", "java", "c", "cpp", "sql", "yaml"
];

const mutedCodeMirrorTheme = EditorView.theme({
  ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.03)" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(255, 255, 255, 0.03)" },
});

interface Props {
  defaultValue: string;
  onChange?: (markdown: string) => void;
  readonly?: boolean;
  className?: string;
}

function EditorInner({ defaultValue, onChange, readonly }: Omit<Props, "className">) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const readonlyRef = useRef(readonly);
  readonlyRef.current = readonly;

  const editorRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || typeof window === "undefined") return;
    loadedRef.current = true;

    async function init() {
      const [{ languages: langs }, { codeMirror }] = await Promise.all([
        import("@codemirror/language-data"),
        import("@milkdown/crepe/feature/code-mirror"),
      ]);

      const filtered = langs.filter((lang: LanguageDescription) =>
        SUPPORTED_LANGUAGE_NAMES.includes(lang.name.toLowerCase())
      );

      if (!editorRef.current) return;

      const crepe = new Crepe({
        root: editorRef.current,
        defaultValue,
        features: {
          [CrepeFeature.CodeMirror]: true,
          [CrepeFeature.Toolbar]: false,
          [CrepeFeature.BlockEdit]: false,
          [CrepeFeature.TopBar]: false,
        },
      }).addFeature(codeMirror, { languages: filtered, theme: mutedCodeMirrorTheme });

      crepeRef.current = crepe;

      crepe.on((api: ListenerManager) => {
        api.markdownUpdated((_ctx, markdown) => {
          onChangeRef.current?.(markdown);
        });
      });

      crepe.create().then(() => {
        if (readonlyRef.current) {
          crepe.setReadonly(true);
        }
      });
    }

    init();
  }, []);

  useEffect(() => {
    if (crepeRef.current) {
      crepeRef.current.setReadonly(readonly ?? false);
    }
  }, [readonly]);

  return <div ref={editorRef} className="h-full w-full" />;
}

export function MilkdownEditor({ className, ...props }: Props) {
  return (
    <div className={className}>
      <EditorInner {...props} />
    </div>
  );
}
import { Crepe } from "@milkdown/crepe";
import { ListenerManager } from "@milkdown/kit/plugin/listener";
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!editorRef.current) return;

    const crepe = new Crepe({
      root: editorRef.current,
      defaultValue,
    });

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

    return () => {
      crepe.destroy();
    };
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
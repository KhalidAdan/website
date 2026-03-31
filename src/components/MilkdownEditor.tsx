import { Editor, defaultValueCtx, editorViewCtx, editorViewOptionsCtx, rootCtx } from "@milkdown/kit/core";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import { useEffect, useRef } from "react";

interface Props {
  defaultValue: string;
  onChange?: (markdown: string) => void;
  readonly?: boolean;
  className?: string;
}

function EditorInner({ defaultValue, onChange, readonly }: Omit<Props, "className">) {
  const [loading, getInstance] = useInstance();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const readonlyRef = useRef(readonly);
  readonlyRef.current = readonly;

  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, defaultValue);
          ctx.set(editorViewOptionsCtx, { editable: () => !readonlyRef.current });
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => onChangeRef.current?.(markdown));
        })
        .use(commonmark)
        .use(gfm)
        .use(listener),
    []
  );

  useEffect(() => {
    if (!loading) {
      getInstance()?.action((ctx) => {
        ctx.get(editorViewCtx).setProps({ editable: () => !readonly });
      });
    }
  }, [loading, getInstance, readonly]);

  return <Milkdown />;
}

export function MilkdownEditor({ className, ...props }: Props) {
  return (
    <MilkdownProvider>
      <div className={className}>
        <EditorInner {...props} />
      </div>
    </MilkdownProvider>
  );
}

'use client';

import { useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { OnMount, OnChange } from '@monaco-editor/react';
import { useBuilderStore, CodeSelection } from '@/stores/useBuilderStore';

// Dynamic import to avoid SSR issues with Monaco
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface EditorPanelProps {
  onSelectionChange: (selection: CodeSelection | null) => void;
}

export function EditorPanel({ onSelectionChange }: EditorPanelProps) {
  const { code, currentPage, currentComponent, setCode } = useBuilderStore();
  const editorRef = useRef<unknown>(null);

  // Determine if we have something to edit
  const hasContent = currentPage || currentComponent;
  const fileName = currentPage
    ? `${currentPage.name}.tsx`
    : currentComponent
    ? `${currentComponent.name}.tsx`
    : 'No file selected';
  const fileType = currentPage?.type || currentComponent?.type || null;

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Configure TypeScript/TSX support
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true,
        esModuleInterop: true,
      });

      // Add React types
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `
        declare module 'react' {
          export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
          export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
          export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
          export function useMemo<T>(factory: () => T, deps: any[]): T;
          export function useRef<T>(initialValue: T): { current: T };
          export const Fragment: any;
          export const createElement: any;
        }
        declare module 'next/image' {
          export default function Image(props: any): JSX.Element;
        }
        declare module 'next/link' {
          export default function Link(props: any): JSX.Element;
        }
        declare module 'lucide-react' {
          export const Menu: any;
          export const X: any;
          export const ChevronDown: any;
          export const ArrowRight: any;
          export const Mail: any;
          export const Phone: any;
          export const MapPin: any;
          export const Clock: any;
          export const Calendar: any;
          export const User: any;
          export const Search: any;
          export const Star: any;
          export const Heart: any;
          export const Check: any;
        }
        `,
        'file:///node_modules/@types/react/index.d.ts'
      );

      // Track selection changes
      editor.onDidChangeCursorSelection(() => {
        const model = editor.getModel();
        if (!model) return;

        const selection = editor.getSelection();
        if (!selection || selection.isEmpty()) {
          onSelectionChange(null);
          return;
        }

        const selectedText = model.getValueInRange(selection);
        if (selectedText && selectedText.trim().length > 0) {
          onSelectionChange({
            start: model.getOffsetAt(selection.getStartPosition()),
            end: model.getOffsetAt(selection.getEndPosition()),
            startLine: selection.startLineNumber,
            endLine: selection.endLineNumber,
            text: selectedText,
          });
        } else {
          onSelectionChange(null);
        }
      });

      // Format on paste
      editor.getModel()?.onDidChangeContent(() => {
        // Optional: auto-format on change
      });
    },
    [onSelectionChange]
  );

  const handleChange: OnChange = useCallback(
    (value) => {
      setCode(value || '');
    },
    [setCode]
  );

  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col">
      {/* Editor Header */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
        <span className={`text-sm ${currentComponent ? 'text-purple-400' : 'text-zinc-400'}`}>
          {fileName}
        </span>
        {fileType && (
          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
            currentComponent
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-zinc-800 text-zinc-500'
          }`}>
            {fileType}
          </span>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        {hasContent ? (
          <Editor
            height="100%"
            language="typescript"
            theme="vs-dark"
            value={code}
            onChange={handleChange}
            onMount={handleMount}
            options={{
              minimap: { enabled: true, scale: 0.8 },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
              fontLigatures: true,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              guides: { indentation: true, bracketPairs: true },
              suggest: { showKeywords: true, showSnippets: true },
              quickSuggestions: { other: true, comments: false, strings: true },
              padding: { top: 16 },
              lineNumbers: 'on',
              folding: true,
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <p className="text-lg mb-2">No file selected</p>
              <p className="text-sm">Select a page or component from the file tree to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

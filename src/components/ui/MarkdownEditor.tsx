import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  Eye,
  Edit3
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write content here... Use formatting tools above for Headings, Bold, Lists.",
  minHeight = "min-h-[220px]"
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const insertText = (before: string, after: string = "") => {
    const textarea = document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) {
      onChange(value + `${before}Heading/Text${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "Text";
    const replacement = `${before}${selectedText}${after}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) {
      onChange(`${prefix} ${value}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Find beginning of current line
    const lastLineBreak = value.lastIndexOf("\n", start - 1);
    const lineStart = lastLineBreak === -1 ? 0 : lastLineBreak + 1;

    const newValue = value.substring(0, lineStart) + `${prefix} ` + value.substring(lineStart);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length + 1, end + prefix.length + 1);
    }, 50);
  };

  const insertTable = () => {
    const tableSnippet = `\n\n| Feature | Basic User | AI-Powered Professional |\n|---|---|---|\n| Approach | Random questions | Structured prompts |\n| Workflow | Manual execution | Automated systems |\n\n`;
    onChange(value + tableSnippet);
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-muted/40 border-b border-border">
        {/* Formatting Action Buttons */}
        <div className="flex items-center flex-wrap gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary"
            onClick={() => insertLinePrefix("#")}
            title="Heading 1 (#)"
          >
            <Heading1 className="h-4 w-4 mr-1 text-primary" /> H1
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary"
            onClick={() => insertLinePrefix("##")}
            title="Heading 2 (##)"
          >
            <Heading2 className="h-4 w-4 mr-1 text-primary" /> H2
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary"
            onClick={() => insertLinePrefix("###")}
            title="Heading 3 (###)"
          >
            <Heading3 className="h-4 w-4 mr-1 text-primary" /> H3
          </Button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => insertText("**", "**")}
            title="Bold (**text**)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => insertText("*", "*")}
            title="Italic (*text*)"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => insertLinePrefix("-")}
            title="Bullet List (- item)"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => insertLinePrefix("1.")}
            title="Numbered List (1. item)"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => insertLinePrefix(">")}
            title="Quote Block (> quote)"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => insertText("`", "`")}
            title="Inline Code (`code`)"
          >
            <Code className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary"
            onClick={insertTable}
            title="Insert Markdown Table"
          >
            <Table className="h-4 w-4 mr-1 text-primary" /> Table
          </Button>
        </div>

        {/* Tab Toggle: Edit vs Preview */}
        <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
          <Button
            type="button"
            variant={activeTab === "edit" ? "secondary" : "ghost"}
            size="sm"
            className={`h-7 text-xs gap-1 ${activeTab === "edit" ? "bg-background shadow-xs font-semibold text-primary" : ""}`}
            onClick={() => setActiveTab("edit")}
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            type="button"
            variant={activeTab === "preview" ? "secondary" : "ghost"}
            size="sm"
            className={`h-7 text-xs gap-1 ${activeTab === "preview" ? "bg-background shadow-xs font-semibold text-primary" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="h-3.5 w-3.5" /> Visual Preview
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="p-3">
        {activeTab === "edit" ? (
          <Textarea
            id="markdown-editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${minHeight} border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm leading-relaxed p-0 bg-transparent resize-y`}
          />
        ) : (
          <div className={`${minHeight} p-2 bg-muted/10 rounded-lg overflow-y-auto`}>
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-sm text-muted-foreground italic py-8 text-center">
                Nothing to preview yet. Switch to "Edit" to type content.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

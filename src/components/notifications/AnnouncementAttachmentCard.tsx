import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ExternalLink,
    Video,
    FileText,
    Copy,
    Check,
    Globe,
    FileCode,
    PlayCircle,
    Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttachmentInfo } from "@/lib/announcementUtils";

interface AnnouncementAttachmentCardProps {
    attachment: AttachmentInfo;
    compact?: boolean;
}

export function AnnouncementAttachmentCard({ attachment, compact = false }: AnnouncementAttachmentCardProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    if (!attachment.hasAttachment || !attachment.url) return null;

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (attachment.url) {
            navigator.clipboard.writeText(attachment.url);
            setCopied(true);
            toast({
                title: "Link Copied! 📋",
                description: "Attachment URL copied to clipboard."
            });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getIcon = () => {
        switch (attachment.type) {
            case 'meet':
            case 'zoom':
                return <Video className="h-4 w-4 text-rose-500" />;
            case 'drive':
            case 'doc':
            case 'pdf':
                return <FileText className="h-4 w-4 text-blue-500" />;
            case 'github':
                return <FileCode className="h-4 w-4 text-emerald-500" />;
            case 'youtube':
                return <PlayCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Globe className="h-4 w-4 text-primary" />;
        }
    };

    const getThemeStyles = () => {
        switch (attachment.type) {
            case 'meet':
            case 'zoom':
                return "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10";
            case 'drive':
            case 'doc':
            case 'pdf':
                return "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10";
            case 'github':
                return "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10";
            default:
                return "border-primary/30 bg-primary/5 hover:bg-primary/10";
        }
    };

    if (compact) {
        return (
            <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all ${getThemeStyles()}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-background/80 shadow-xs shrink-0">
                        {getIcon()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{attachment.label}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{attachment.hostname}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        title="Copy link"
                    >
                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button size="sm" className="h-7 px-2 text-xs gap-1 font-semibold">
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={`mt-3 p-3 sm:p-4 rounded-xl border transition-all duration-200 shadow-xs ${getThemeStyles()}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-background/90 shadow-xs border border-border/40 shrink-0 mt-0.5 sm:mt-0">
                        {getIcon()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 bg-background/80">
                                📎 Attached Link
                            </Badge>
                            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[200px]">
                                {attachment.hostname}
                            </span>
                        </div>
                        <h5 className="font-bold text-sm text-foreground mt-0.5 line-clamp-1">
                            {attachment.label}
                        </h5>
                        <p className="text-[11px] text-muted-foreground font-mono truncate max-w-sm sm:max-w-md pt-0.5">
                            {attachment.url}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-background/80"
                        onClick={handleCopy}
                        title="Copy URL"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Link</span>
                            </>
                        )}
                    </Button>

                    <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                    >
                        <Button size="sm" className="h-8 gap-1.5 text-xs font-bold shadow-xs">
                            <Paperclip className="h-3.5 w-3.5" />
                            <span>Launch Resource</span>
                            <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                    </a>
                </div>
            </div>
        </div>
    );
}

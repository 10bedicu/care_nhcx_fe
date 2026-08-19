import { ChevronDownIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { CLAIM_FILE_TEMPLATES } from "@/lib/constants";
import { FC, useState } from "react";

export const ClaimFileTemplatesPanel: FC = () => {
  const [collapsed, setCollapsed] = useState(true);

  if (CLAIM_FILE_TEMPLATES.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileTextIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">
              Document Templates
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download, fill in and upload as supporting documents
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label={collapsed ? "Expand panel" : "Minimize panel"}
            aria-expanded={!collapsed}
          >
            <ChevronDownIcon
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                collapsed ? "-rotate-90" : ""
              }`}
            />
          </button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0 space-y-2">
          {CLAIM_FILE_TEMPLATES.map((template) => (
            <div
              key={template.url}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{template.label}</p>
                {template.description && (
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a
                  href={template.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <DownloadIcon className="h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
};

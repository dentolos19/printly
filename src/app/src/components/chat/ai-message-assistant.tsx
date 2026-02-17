"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/environment";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

export interface AiMessageAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
  subject: string;
  authorizedFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

export function AiMessageAssistant({ isOpen, onClose, onInsert, subject, authorizedFetch }: AiMessageAssistantProps) {
  const [draft, setDraft] = useState("");
  const [refinement, setRefinement] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = [
        "You are a helpful writing assistant for a customer support platform called Printly (a print-on-demand service).",
        "Help the user write a clear, polite support message.",
        "",
        `Subject: ${subject}`,
        ...(draft.trim() ? [`The user started writing: "${draft.trim()}"`] : []),
        "",
        "Write a professional but friendly support message based on the above. Keep it concise (3-5 sentences).",
        "Write in first person as the customer. Do not use markdown formatting.",
        "Return ONLY the message text, nothing else.",
      ].join("\n");

      const response = await authorizedFetch(`${API_URL}/generate/text?prompt=${encodeURIComponent(prompt)}`);
      if (!response.ok) {
        throw new Error("Failed to generate text");
      }
      const generatedText = await response.text();
      setDraft(generatedText);
      setHasGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }, [authorizedFetch, draft, subject]);

  const handleRefine = useCallback(async () => {
    if (!refinement.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = [
        "You are a helpful writing assistant. Refine the following support message based on the user's instructions.",
        "",
        "Current message:",
        `"${draft}"`,
        "",
        `Refinement instructions: ${refinement.trim()}`,
        "",
        "Return ONLY the refined message text, nothing else. Do not use markdown formatting.",
      ].join("\n");

      const response = await authorizedFetch(`${API_URL}/generate/text?prompt=${encodeURIComponent(prompt)}`);
      if (!response.ok) {
        throw new Error("Failed to refine text");
      }
      const refinedText = await response.text();
      setDraft(refinedText);
      setRefinement("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }, [authorizedFetch, draft, refinement]);

  const handleClose = useCallback(() => {
    setDraft("");
    setRefinement("");
    setHasGenerated(false);
    setError(null);
    onClose();
  }, [onClose]);

  const handleInsert = useCallback(() => {
    onInsert(draft);
    setDraft("");
    setRefinement("");
    setHasGenerated(false);
    setError(null);
  }, [draft, onInsert]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5" />
            AI Assistant
          </DialogTitle>
          <p className="text-muted-foreground text-sm">Draft a support message with AI help</p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Context */}
          <div className="bg-muted rounded-md px-3 py-2 text-sm">
            <span className="text-muted-foreground">Subject:</span> <span className="font-medium">{subject}</span>
          </div>

          {/* Main draft textarea */}
          <div className="grid gap-2">
            <Label htmlFor="ai-draft">Your message</Label>
            <div className="flex gap-2">
              <Sparkles className="text-primary/40 mt-2.5 h-4 w-4 shrink-0" />
              <Textarea
                id="ai-draft"
                placeholder="Start typing what you want to say, or click Generate to let AI draft it for you..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                disabled={isGenerating}
                className="border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {/* Generate / Regenerate button */}
          <Button variant="outline" size="sm" className="w-fit gap-2" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {hasGenerated ? "Regenerate" : "Generate"}
          </Button>

          {/* Error */}
          {error && <p className="text-destructive text-sm">{error}</p>}

          {/* Refinement section — only after first generation */}
          {hasGenerated && (
            <div className="grid gap-2">
              <Label htmlFor="ai-refine" className="text-muted-foreground text-sm">
                Want to refine? Provide additional instructions:
              </Label>
              <div className="flex gap-2">
                <Textarea
                  id="ai-refine"
                  placeholder="E.g., Make it more formal, add urgency, mention we need this by Friday..."
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  rows={2}
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="justify-end gap-3 px-6 py-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {hasGenerated && (
            <Button
              variant="outline"
              className="text-primary"
              onClick={handleRefine}
              disabled={isGenerating || !refinement.trim()}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refine
            </Button>
          )}
          <Button onClick={handleInsert} disabled={!draft.trim()} className="gap-1.5">
            Insert
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

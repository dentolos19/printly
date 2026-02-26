"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import { PostStatus } from "@/lib/server/community";
import { Loader2, PlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

export function CreatePostDialog({ open, onOpenChange, onPostCreated }: CreatePostDialogProps) {
  const { api } = useServer();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isNsfw, setIsNsfw] = useState(false);
  const [contentWarning, setContentWarning] = useState("");

  const handleAddTag = () => {
    const newTag = tagInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (newTag && !tags.includes(newTag) && tags.length < 10) {
      setTags((prev) => [...prev, newTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);

      // Upload the image immediately to get the asset ID for AI caption
      try {
        const asset = await api.asset.uploadAsset(selectedFile);
        setUploadedAssetId(asset.id);
      } catch (error) {
        toast.error("Failed to upload image");
        setFile(null);
        setPreview(null);
      }
    }
  };

  const handleGenerateCaption = async () => {
    if (!uploadedAssetId) {
      toast.error("Please upload a photo first");
      return;
    }

    setGeneratingCaption(true);
    try {
      const response = await api.community.generateCaption({
        photoId: uploadedAssetId,
        prompt: aiPrompt.trim() || undefined,
      });
      setCaption(response.caption);
      toast.success("Caption generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate caption");
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleClearPhoto = () => {
    setFile(null);
    setPreview(null);
    setUploadedAssetId(null);
    setAiPrompt("");
  };

  const handleSubmit = async () => {
    if (!uploadedAssetId || !caption.trim()) {
      toast.error("Please add a photo and caption");
      return;
    }

    setSubmitting(true);
    try {
      // Create the post with already-uploaded asset
      await api.community.createPost({
        caption: caption.trim(),
        photoId: uploadedAssetId,
        postStatus: PostStatus.Published,
        tags: tags.length > 0 ? tags : undefined,
        isNsfw: isNsfw || undefined,
        contentWarning: contentWarning.trim() || undefined,
      });

      toast.success("Post created successfully!");
      onOpenChange(false);
      onPostCreated();
      setCaption("");
      setFile(null);
      setPreview(null);
      setUploadedAssetId(null);
      setAiPrompt("");
      setTags([]);
      setTagInput("");
      setIsNsfw(false);
      setContentWarning("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>Share something with the community</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="aspect-square w-full rounded-lg object-cover" />
                <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={handleClearPhoto}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="border-muted-foreground/25 hover:border-muted-foreground/50 flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors">
                <PlusIcon className="text-muted-foreground h-10 w-10" />
                <span className="text-muted-foreground text-sm">Click to upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Caption</Label>
              {uploadedAssetId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCaption}
                  disabled={generatingCaption}
                  className="gap-1.5 text-xs"
                >
                  {generatingCaption ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-3 w-3" />
                      Generate with AI
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          {/* AI Prompt (optional) */}
          {uploadedAssetId && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">AI Guidance (optional)</Label>
              <Input
                placeholder="e.g., Make it fun and casual, or professional tone..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="text-sm"
              />
              <p className="text-muted-foreground text-xs">Give the AI hints about what kind of caption you want</p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddTag} disabled={!tagInput.trim()}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive ml-0.5">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-xs">Press Enter or comma to add. Max 10 tags.</p>
          </div>

          {/* NSFW & Content Warning */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="nsfw-toggle">Mark as NSFW</Label>
                <p className="text-muted-foreground text-xs">Content will be blurred by default</p>
              </div>
              <Switch id="nsfw-toggle" checked={isNsfw} onCheckedChange={setIsNsfw} />
            </div>
            {isNsfw && (
              <div className="space-y-1">
                <Label className="text-xs">Content Warning (optional)</Label>
                <Input
                  placeholder="e.g., Contains graphic content"
                  value={contentWarning}
                  onChange={(e) => setContentWarning(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !uploadedAssetId || !caption.trim()}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

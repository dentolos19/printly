"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import { Asset } from "@/lib/server/asset";
import { DownloadIcon, ImageIcon, SparklesIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function Page() {
  const { api } = useServer();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // Generate states
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.asset.getAssets();
      setAssets(data);

      // Pre-fetch download URLs for all assets
      const urls: Record<string, string> = {};
      await Promise.all(
        data.map(async (asset) => {
          try {
            const { url } = await api.asset.downloadAsset(asset.id);
            urls[asset.id] = url;
          } catch (error) {
            console.error(`Failed to get URL for asset ${asset.id}`, error);
          }
        }),
      );
      setImageUrls(urls);
    } catch (error) {
      toast.error("Failed to load assets");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api.asset]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const asset = await api.asset.uploadAsset(uploadFile, uploadDescription);
      setAssets((prev) => [asset, ...prev]);
      // Fetch download URL for the new asset
      const { url } = await api.asset.downloadAsset(asset.id);
      setImageUrls((prev) => ({ ...prev, [asset.id]: url }));
      toast.success("Asset uploaded successfully");
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadDescription("");
    } catch (error) {
      toast.error("Failed to upload asset");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      setGenerating(true);
      const blob = await api.generate.generateImage(generatePrompt);
      const file = new File([blob], `generated-${Date.now()}.png`, { type: blob.type });
      const asset = await api.asset.uploadAsset(file, `Generated: ${generatePrompt}`);
      setAssets((prev) => [asset, ...prev]);
      // Fetch download URL for the new asset
      const { url } = await api.asset.downloadAsset(asset.id);
      setImageUrls((prev) => ({ ...prev, [asset.id]: url }));
      toast.success("Image generated successfully");
      setGenerateDialogOpen(false);
      setGeneratePrompt("");
    } catch (error) {
      toast.error("Failed to generate image");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (asset: Asset) => {
    try {
      const { url } = await api.asset.downloadAsset(asset.id);
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Failed to get download URL");
      console.error(error);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm("Are you sure you want to delete this asset?")) {
      return;
    }

    try {
      await api.asset.deleteAsset(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.success("Asset deleted successfully");
      setDetailDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete asset");
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openAssetDetail = (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailDialogOpen(true);
  };

  const renderAssetCard = (asset: Asset) => (
    <Card
      key={asset.id}
      className={"cursor-pointer transition-shadow hover:shadow-lg"}
      onClick={() => openAssetDetail(asset)}
    >
      <CardHeader className={"p-0"}>
        <div className={"bg-muted relative aspect-square overflow-hidden rounded-t-lg"}>
          {imageUrls[asset.id] ? (
            <img src={imageUrls[asset.id]} alt={asset.name} className={"size-full object-cover"} />
          ) : (
            <div className={"flex size-full items-center justify-center"}>
              <Spinner />
            </div>
          )}
          {asset.isGenerated && (
            <div className={"bg-primary text-primary-foreground absolute top-2 right-2 rounded-full px-2 py-1 text-xs"}>
              <SparklesIcon className={"inline size-3"} /> AI
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={"p-3"}>
        <h3 className={"truncate font-semibold"}>{asset.name}</h3>
        {asset.description && <p className={"text-muted-foreground line-clamp-2 text-xs"}>{asset.description}</p>}
        <p className={"text-muted-foreground mt-1 text-xs"}>{formatFileSize(asset.size)}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className={"container mx-auto p-6"}>
      <div className={"mb-6 flex items-center justify-between"}>
        <div>
          <h1 className={"text-3xl font-bold"}>Asset Library</h1>
          <p className={"text-muted-foreground"}>Upload images or generate them with AI prompts</p>
        </div>
        <div className={"flex gap-2"}>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UploadIcon />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Asset</DialogTitle>
                <DialogDescription>Upload an image to your asset library</DialogDescription>
              </DialogHeader>
              <div className={"space-y-4"}>
                <div>
                  <Label htmlFor={"file"}>File</Label>
                  <Input
                    id={"file"}
                    type={"file"}
                    accept={"image/*"}
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label htmlFor={"description"}>Description (optional)</Label>
                  <Textarea
                    id={"description"}
                    placeholder={"Add a description for this asset..."}
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant={"outline"} onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
                  {uploading ? <Spinner /> : <UploadIcon />}
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant={"outline"}>
                <SparklesIcon />
                Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Image</DialogTitle>
                <DialogDescription>Use AI to generate an image from a text prompt</DialogDescription>
              </DialogHeader>
              <div className={"space-y-4"}>
                <div>
                  <Label htmlFor={"prompt"}>Prompt</Label>
                  <Textarea
                    id={"prompt"}
                    placeholder={"Describe the image you want to generate..."}
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant={"outline"} onClick={() => setGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generating || !generatePrompt.trim()}>
                  {generating ? <Spinner /> : <SparklesIcon />}
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue={"all"} className={"w-full"}>
        <TabsList>
          <TabsTrigger value={"all"}>All Assets</TabsTrigger>
          <TabsTrigger value={"uploaded"}>Uploaded</TabsTrigger>
          <TabsTrigger value={"generated"}>Generated</TabsTrigger>
        </TabsList>

        <TabsContent value={"all"} className={"mt-6"}>
          {loading ? (
            <div className={"flex items-center justify-center py-12"}>
              <Spinner className={"size-8"} />
            </div>
          ) : assets.length === 0 ? (
            <Card>
              <CardContent className={"flex flex-col items-center justify-center py-12"}>
                <ImageIcon className={"text-muted-foreground mb-4 size-12"} />
                <h3 className={"mb-2 text-lg font-semibold"}>No assets yet</h3>
                <p className={"text-muted-foreground mb-4 text-center text-sm"}>
                  Upload your first asset or generate one with AI
                </p>
                <div className={"flex gap-2"}>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <UploadIcon />
                    Upload Asset
                  </Button>
                  <Button variant={"outline"} onClick={() => setGenerateDialogOpen(true)}>
                    <SparklesIcon />
                    Generate Image
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={"grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}>
              {assets.map((asset) => renderAssetCard(asset))}
            </div>
          )}
        </TabsContent>

        <TabsContent value={"uploaded"} className={"mt-6"}>
          <div className={"grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}>
            {assets.filter((asset) => !asset.isGenerated).map((asset) => renderAssetCard(asset))}
          </div>
        </TabsContent>

        <TabsContent value={"generated"} className={"mt-6"}>
          <div className={"grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}>
            {assets.filter((asset) => asset.isGenerated).map((asset) => renderAssetCard(asset))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset Detail Dialog */}
      {selectedAsset && (
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className={"max-w-2xl"}>
            <DialogHeader>
              <DialogTitle>{selectedAsset.name}</DialogTitle>
              <DialogDescription>
                {selectedAsset.isGenerated ? "AI Generated Image" : "Uploaded Image"}
              </DialogDescription>
            </DialogHeader>
            <div className={"space-y-4"}>
              <div className={"bg-muted relative aspect-video overflow-hidden rounded-lg"}>
                {imageUrls[selectedAsset.id] ? (
                  <img
                    src={imageUrls[selectedAsset.id]}
                    alt={selectedAsset.name}
                    className={"size-full object-contain"}
                  />
                ) : (
                  <div className={"flex size-full items-center justify-center"}>
                    <Spinner />
                  </div>
                )}
              </div>
              <div className={"space-y-2 text-sm"}>
                {selectedAsset.description && (
                  <div>
                    <strong>Description:</strong> {selectedAsset.description}
                  </div>
                )}
                <div>
                  <strong>Type:</strong> {selectedAsset.type}
                </div>
                <div>
                  <strong>Size:</strong> {formatFileSize(selectedAsset.size)}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(selectedAsset.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <DialogFooter className={"flex gap-2"}>
              <Button variant={"outline"} onClick={() => handleDownload(selectedAsset)}>
                <DownloadIcon />
                Download
              </Button>
              <Button variant={"destructive"} onClick={() => handleDelete(selectedAsset)}>
                <Trash2Icon />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

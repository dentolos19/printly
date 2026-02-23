"use client";

import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function AutoFramedModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    if (!groupRef.current || !clonedScene) return;

    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    groupRef.current.add(clonedScene);

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Shift the model so its bounding-box center sits at the origin
    groupRef.current.position.set(-center.x, -center.y, -center.z);

    const perspCam = camera as THREE.PerspectiveCamera;
    const fov = perspCam.fov * (Math.PI / 180);
    const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.5;

    perspCam.position.set(distance * 0.5, distance * 0.3, distance);
    perspCam.lookAt(0, 0, 0);
    perspCam.updateProjectionMatrix();
  }, [clonedScene, camera]);

  return <group ref={groupRef} />;
}

export type ModelPreviewHandle = {
  captureScreenshot: () => Promise<File | null>;
};

type ModelPreviewProps = {
  file: File;
  onScreenshotReady?: (file: File) => void;
  onError?: (error: string) => void;
};

const ModelPreview = forwardRef<ModelPreviewHandle, ModelPreviewProps>(function ModelPreview(
  { file, onScreenshotReady, onError },
  ref,
) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasCapturedRef = useRef(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setLoaded(false);
    setHasError(false);
    hasCapturedRef.current = false;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const captureScreenshot = useCallback(async (): Promise<File | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return new Promise<File | null>((resolve) => {
      // Small delay to ensure the scene has rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const screenshotFile = new File([blob], "model-preview.png", { type: "image/png" });
                resolve(screenshotFile);
              } else {
                resolve(null);
              }
            },
            "image/png",
            1.0,
          );
        });
      });
    });
  }, []);

  useImperativeHandle(ref, () => ({ captureScreenshot }), [captureScreenshot]);

  // Auto-capture screenshot once the model loads
  useEffect(() => {
    if (!loaded || hasCapturedRef.current || !onScreenshotReady) return;
    hasCapturedRef.current = true;

    const timer = setTimeout(async () => {
      const screenshot = await captureScreenshot();
      if (screenshot) {
        onScreenshotReady(screenshot);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loaded, captureScreenshot, onScreenshotReady]);

  if (!objectUrl) return null;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
      {hasError ? (
        <div className="text-destructive flex h-full w-full flex-col items-center justify-center text-center">
          <p className="text-sm font-medium">Failed to load 3D model</p>
          <p className="text-muted-foreground text-xs">The file may be corrupted or in an unsupported format.</p>
        </div>
      ) : (
        <>
          <Canvas
            ref={canvasRef}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            camera={{ fov: 45, near: 0.01, far: 1000 }}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={0.8} />
              <directionalLight position={[-3, 3, -3]} intensity={0.3} />
              <Environment preset="studio" />
              <ModelLoader
                url={objectUrl}
                onLoaded={() => setLoaded(true)}
                onError={(msg) => {
                  setHasError(true);
                  onError?.(msg);
                }}
              />
              <OrbitControls makeDefault enablePan={false} />
            </Suspense>
          </Canvas>
          {!loaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}
        </>
      )}
    </div>
  );
});

function ModelLoader({
  url,
  onLoaded,
  onError,
}: {
  url: string;
  onLoaded: () => void;
  onError: (msg: string) => void;
}) {
  const hasCalledRef = useRef(false);

  useEffect(() => {
    hasCalledRef.current = false;
  }, [url]);

  try {
    return (
      <AutoFramedModelWithCallback
        url={url}
        onLoaded={() => {
          if (!hasCalledRef.current) {
            hasCalledRef.current = true;
            onLoaded();
          }
        }}
      />
    );
  } catch {
    if (!hasCalledRef.current) {
      hasCalledRef.current = true;
      onError("Failed to parse 3D model file");
    }
    return null;
  }
}

function AutoFramedModelWithCallback({ url, onLoaded }: { url: string; onLoaded: () => void }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    if (scene) {
      onLoaded();
    }
  }, [scene, onLoaded]);

  return <AutoFramedModel url={url} />;
}

export default ModelPreview;

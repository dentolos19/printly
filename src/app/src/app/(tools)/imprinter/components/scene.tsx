"use client";

import { Decal, Environment, OrbitControls, PerspectiveCamera, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import type { ErrorInfo, ReactNode } from "react";
import {
  Component,
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import type { AppliedDesign, PrintAreaConfig } from "../types";
import { useImprinter } from "./hooks/use-imprinter";

// Screenshot capture context
type ScreenshotContextValue = {
  captureScreenshot: () => Promise<Blob | null>;
};

const ScreenshotContext = createContext<ScreenshotContextValue | null>(null);

export function useScreenshot() {
  return useContext(ScreenshotContext);
}

// ============================================================================
// Math & Transform Logic
// ============================================================================

function calculateDecalTransform(
  targetMesh: THREE.Mesh,
  rayDir: [number, number, number],
  offsetPosition: THREE.Vector3,
): { position: THREE.Vector3; orientation: THREE.Euler } {
  const raycaster = new THREE.Raycaster();

  const box = new THREE.Box3().setFromObject(targetMesh);
  const meshCenter = box.getCenter(new THREE.Vector3());
  const meshSize = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(meshSize.x, meshSize.y, meshSize.z);

  // Use provided ray direction
  const rayDirection = new THREE.Vector3(rayDir[0], rayDir[1], rayDir[2]).normalize();

  const rayOrigin = meshCenter
    .clone()
    .add(rayDirection.clone().multiplyScalar(maxDimension * 2))
    .add(offsetPosition);

  raycaster.set(rayOrigin, rayDirection.clone().negate());

  const intersects = raycaster.intersectObject(targetMesh, true);

  if (intersects.length > 0) {
    const intersection = intersects[0];

    // Position/Rotation relative to the mesh (Local Space)
    const hitPointLocal = intersection.point.clone();
    intersection.object.worldToLocal(hitPointLocal);

    const normalLocal = intersection.face!.normal.clone();

    const lookAtMatrix = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);

    const target = hitPointLocal.clone().add(normalLocal);

    lookAtMatrix.lookAt(hitPointLocal, target, up);
    const orientation = new THREE.Euler().setFromRotationMatrix(lookAtMatrix);

    return { position: hitPointLocal, orientation };
  }

  // Fallback
  const fallbackPos = layerZOnBox(targetMesh, 0.05);

  return {
    position: fallbackPos,
    orientation: new THREE.Euler(0, 0, 0),
  };
}

function layerZOnBox(mesh: THREE.Mesh, offset: number) {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox || new THREE.Box3();
  const center = bbox.getCenter(new THREE.Vector3());
  return new THREE.Vector3(center.x, center.y, bbox.max.z + offset);
}

// Error boundary for Three.js components that may fail to load textures/models
class AssetErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Asset loading error:", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

// ============================================================================
// Components
// ============================================================================

function DesignDecal({
  design,
  targetMesh,
  printAreaConfig,
  maxAnisotropy,
}: {
  design: AppliedDesign;
  targetMesh: THREE.Mesh;
  printAreaConfig: PrintAreaConfig | undefined;
  maxAnisotropy: number;
}) {
  if (!design.designData) return null;

  const textureUrl = design.designData.coverId
    ? design.designData.coverId.startsWith("blob:") || design.designData.coverId.startsWith("data:")
      ? design.designData.coverId
      : `/assets/${design.designData.coverId}/view`
    : null;

  if (!textureUrl) return null;

  return (
    <AssetErrorBoundary>
      <Suspense fallback={null}>
        <DecalMesh
          design={design}
          url={textureUrl}
          targetMesh={targetMesh}
          printAreaConfig={printAreaConfig}
          maxAnisotropy={maxAnisotropy}
        />
      </Suspense>
    </AssetErrorBoundary>
  );
}

function DecalMesh({
  design,
  url,
  targetMesh,
  printAreaConfig,
  maxAnisotropy,
}: {
  design: AppliedDesign;
  url: string;
  targetMesh: THREE.Mesh;
  printAreaConfig: PrintAreaConfig | undefined;
  maxAnisotropy: number;
}) {
  const texture = useTexture(url);
  const decalTexture = useMemo(() => {
    const next = texture.clone();
    next.wrapS = THREE.RepeatWrapping;
    next.repeat.set(-1, 1);
    next.offset.set(1, 0);
    next.anisotropy = maxAnisotropy;
    next.needsUpdate = true;
    return next;
  }, [texture, maxAnisotropy]);

  useEffect(() => {
    return () => {
      decalTexture.dispose();
    };
  }, [decalTexture]);

  // Get ray direction from config or use default based on area ID
  const rayDirection = useMemo<[number, number, number]>(() => {
    if (printAreaConfig?.rayDirection) {
      return printAreaConfig.rayDirection;
    }
    // Fallback based on print area ID
    switch (design.printArea) {
      case "back":
        return [0, 0, -1];
      case "left-sleeve":
        return [-1, 0, 0];
      case "right-sleeve":
        return [1, 0, 0];
      case "front":
      default:
        return [0, 0, 1];
    }
  }, [printAreaConfig, design.printArea]);

  // Configuration
  const { position, orientation } = useMemo(() => {
    const offset = new THREE.Vector3(
      design.transform.position[0],
      design.transform.position[1],
      design.transform.position[2],
    );
    return calculateDecalTransform(targetMesh, rayDirection, offset);
  }, [targetMesh, rayDirection, design.transform.position]);

  // Apply rotation offset
  const finalOrientation = useMemo(() => {
    const euler = orientation.clone();
    euler.x += design.transform.rotation[0];
    euler.y += design.transform.rotation[1];
    euler.z += design.transform.rotation[2];
    return euler;
  }, [orientation, design.transform.rotation]);

  // Scale
  const scale = useMemo<[number, number, number]>(() => {
    // Base scale factor
    const s = design.transform.scale[0];
    // We usually want a square or aspect-ratio preserved decal
    // But design.transform.scale is 3d.
    // Let's assume uniform X/Y for now, and Z (projection depth) fixed
    return [s * 0.5, s * 0.5, 0.5];
  }, [design.transform.scale]);

  return (
    <Decal position={position} rotation={finalOrientation} scale={scale}>
      <meshStandardMaterial
        map={decalTexture}
        transparent
        opacity={design.opacity}
        depthTest={true}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
      />
    </Decal>
  );
}

type MeshMap = {
  body: THREE.Mesh | null;
  leftSleeve: THREE.Mesh | null;
  rightSleeve: THREE.Mesh | null;
};

// Dynamic model loader component
function DynamicModel({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!scene) return;

    // Clone the scene to avoid modifying the cached version
    const clonedScene = scene.clone();

    // Apply color to all meshes
    clonedScene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshStandardMaterial;
        // Clone material to avoid affecting other instances
        child.material = material.clone();
        (child.material as THREE.MeshStandardMaterial).color = new THREE.Color(color);
      }
    });

    if (modelRef.current) {
      // Clear existing children
      while (modelRef.current.children.length > 0) {
        modelRef.current.remove(modelRef.current.children[0]);
      }
      // Add cloned scene
      modelRef.current.add(clonedScene);
    }
  }, [scene, color]);

  return <group ref={modelRef} />;
}

// Placeholder when no model is selected
function NoModelPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1.5, 0.5]} />
      <meshStandardMaterial color="#666666" wireframe />
    </mesh>
  );
}

function CanvasModel() {
  const {
    productColor,
    appliedDesigns,
    modelConfig,
    selectedProduct,
    availablePrintAreas,
    activeTool,
    addImageToProduct,
    activePrintArea,
  } = useImprinter();
  const { gl } = useThree();
  const modelRef = useRef<THREE.Group>(null);
  const [meshes, setMeshes] = useState<MeshMap>({ body: null, leftSleeve: null, rightSleeve: null });
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  // Only render visible designs
  const visibleDesigns = useMemo(() => appliedDesigns.filter((d) => d.visible !== false), [appliedDesigns]);

  // Create a map of print area ID to config for quick lookup
  const printAreaConfigMap = useMemo(() => {
    const map = new Map<string, PrintAreaConfig>();
    availablePrintAreas.forEach((config) => {
      map.set(config.id, config);
    });
    return map;
  }, [availablePrintAreas]);

  // Get model URL from selected product - use proxied URL to avoid CORS issues
  const modelUrl = selectedProduct?.product.modelId ? `/assets/${selectedProduct.product.modelId}/view` : null;

  // Safety check: don't render if no model URL
  if (!modelUrl) {
    return <NoModelPlaceholder />;
  }

  // Find and categorize meshes by position and material
  useEffect(() => {
    if (!modelRef.current) return;

    // Small delay to allow the model to load
    const timer = setTimeout(() => {
      if (!modelRef.current) return;

      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      modelRef.current.position.sub(center);

      let bodyMesh: THREE.Mesh | null = null;
      let leftSleeveMesh: THREE.Mesh | null = null;
      let rightSleeveMesh: THREE.Mesh | null = null;
      let maxBodyDimension = 0;

      modelRef.current.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          if (child.material) {
            const material = child.material as THREE.MeshStandardMaterial;
            material.color = new THREE.Color(productColor);

            // Categorize mesh by material name or position
            const materialName = material.name?.toLowerCase() || "";
            child.geometry.computeBoundingBox();
            const bbox = child.geometry.boundingBox;

            if (bbox) {
              const meshCenter = bbox.getCenter(new THREE.Vector3());
              child.localToWorld(meshCenter);
              const size = new THREE.Vector3();
              bbox.getSize(size);
              const dimension = size.length();

              // Check if it's a sleeve based on material name or position
              if (materialName.includes("sleeve")) {
                if (meshCenter.x < -0.1 && !leftSleeveMesh) {
                  leftSleeveMesh = child;
                } else if (meshCenter.x > 0.1 && !rightSleeveMesh) {
                  rightSleeveMesh = child;
                }
              } else if (materialName.includes("body") || materialName.includes("main")) {
                // Body mesh
                if (dimension > maxBodyDimension) {
                  maxBodyDimension = dimension;
                  bodyMesh = child;
                }
              } else {
                // Fallback: largest mesh as body
                if (dimension > maxBodyDimension) {
                  maxBodyDimension = dimension;
                  bodyMesh = child;
                }
              }
            }
          }
        }
      });

      // Fallback: if no specific meshes found, use the largest as body
      if (!bodyMesh) {
        modelRef.current.traverse((child: THREE.Object3D) => {
          if (!bodyMesh && child instanceof THREE.Mesh) {
            bodyMesh = child;
          }
        });
      }

      setMeshes({
        body: bodyMesh,
        leftSleeve: leftSleeveMesh,
        rightSleeve: rightSleeveMesh,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [productColor, modelUrl]);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.updateMatrixWorld(true);
    }
  });

  // Helper function to get the appropriate mesh for a print area
  const getMeshForPrintArea = useCallback(
    (printArea: string): THREE.Mesh | null => {
      // First, try to find mesh by name from print area config
      const config = printAreaConfigMap.get(printArea);
      if (config?.meshName && modelRef.current) {
        let foundMesh: THREE.Mesh | null = null;
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === config.meshName) {
            foundMesh = child;
          }
        });
        if (foundMesh) return foundMesh;
      }

      // Fallback to hardcoded logic
      switch (printArea) {
        case "left-sleeve":
          return meshes.leftSleeve || meshes.body;
        case "right-sleeve":
          return meshes.rightSleeve || meshes.body;
        case "front":
        case "back":
        default:
          return meshes.body;
      }
    },
    [meshes, printAreaConfigMap],
  );

  // Group designs by their target mesh
  const designsByMesh = useMemo(() => {
    const grouped = new Map<THREE.Mesh, AppliedDesign[]>();

    visibleDesigns.forEach((design) => {
      if (!design.designData?.coverId) return;

      const targetMesh = getMeshForPrintArea(design.printArea);
      if (targetMesh && targetMesh.parent) {
        const existing = grouped.get(targetMesh) || [];
        grouped.set(targetMesh, [...existing, design]);
      }
    });

    return grouped;
  }, [visibleDesigns, getMeshForPrintArea]);

  return (
    <group ref={modelRef}>
      {modelUrl ? (
        <Suspense fallback={<NoModelPlaceholder />}>
          <DynamicModel url={modelUrl} color={productColor} />
        </Suspense>
      ) : (
        <NoModelPlaceholder />
      )}

      {/* Render decals for each mesh */}
      {Array.from(designsByMesh.entries()).map(([mesh, designs]) => {
        // Double-check mesh is still attached to scene
        if (!mesh.parent) return null;

        return (
          <group key={mesh.uuid}>
            {createPortal(
              <>
                {designs.map((design) => (
                  <DesignDecal
                    key={design.id}
                    design={design}
                    targetMesh={mesh}
                    printAreaConfig={printAreaConfigMap.get(design.printArea)}
                    maxAnisotropy={maxAnisotropy}
                  />
                ))}
              </>,
              mesh,
            )}
          </group>
        );
      })}
    </group>
  );
}

// Screenshot capture component that registers the GL context
function ScreenshotCapture({ onRegister }: { onRegister: (capture: () => Promise<Blob | null>) => void }) {
  const { gl, scene, camera } = useThree();
  const { registerCaptureFunction, registerHighResCaptureFunction } = useImprinter();

  useEffect(() => {
    const captureFunction = async (): Promise<Blob | null> => {
      return new Promise((resolve) => {
        gl.render(scene, camera);
        gl.domElement.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/png",
          1.0,
        );
      });
    };

    onRegister(captureFunction);
    registerCaptureFunction(captureFunction);
  }, [gl, scene, camera, onRegister, registerCaptureFunction]);

  useEffect(() => {
    const highResCapture = async (width: number, height: number): Promise<Blob | null> => {
      const originalSize = gl.getSize(new THREE.Vector2());
      const originalPixelRatio = gl.getPixelRatio();

      try {
        gl.setSize(width, height, false);
        gl.setPixelRatio(1);
        gl.render(scene, camera);

        return new Promise((resolve) => {
          gl.domElement.toBlob((blob) => resolve(blob), "image/png", 1.0);
        });
      } finally {
        gl.setSize(originalSize.x, originalSize.y, false);
        gl.setPixelRatio(originalPixelRatio);
      }
    };

    registerHighResCaptureFunction(highResCapture);
  }, [gl, scene, camera, registerHighResCaptureFunction]);

  return null;
}

export function ImprinterScene() {
  const captureRef = useRef<(() => Promise<Blob | null>) | null>(null);
  const { addImageToProduct, activePrintArea, activeTool } = useImprinter();
  const [isDragging, setIsDragging] = useState(false);

  const handleRegisterCapture = useCallback((capture: () => Promise<Blob | null>) => {
    captureRef.current = capture;
  }, []);

  const captureScreenshot = useCallback(async (): Promise<Blob | null> => {
    if (captureRef.current) {
      return captureRef.current();
    }
    return null;
  }, []);

  const contextValue = useMemo(() => ({ captureScreenshot }), [captureScreenshot]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));

      for (const file of imageFiles) {
        addImageToProduct(file, activePrintArea);
      }
    },
    [addImageToProduct, activePrintArea],
  );

  return (
    <ScreenshotContext.Provider value={contextValue}>
      <div
        className="relative h-full w-full"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="border-primary bg-primary/10 pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-primary text-lg font-medium">Drop image to apply as decal</p>
          </div>
        )}
        {activeTool === "place" && (
          <div className="pointer-events-none absolute top-3 left-1/2 z-40 -translate-x-1/2 rounded-md bg-black/70 px-3 py-1.5 text-sm text-white">
            Click on the model to place a decal
          </div>
        )}
        <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
          <ScreenshotCapture onRegister={handleRegisterCapture} />
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
          <ambientLight intensity={0.6} />
          <spotLight position={[5, 5, 5]} angle={0.3} penumbra={1} intensity={1} castShadow />
          <spotLight position={[-5, 5, 5]} angle={0.3} penumbra={1} intensity={0.5} />
          <directionalLight position={[0, 5, 0]} intensity={0.3} />
          <Environment preset="studio" />
          <Suspense fallback={null}>
            <CanvasModel />
          </Suspense>
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.5}
            maxDistance={50}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>
    </ScreenshotContext.Provider>
  );
}

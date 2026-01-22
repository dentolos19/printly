"use client";

import { Decal, Environment, OrbitControls, PerspectiveCamera, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AppliedDesign } from "../types";
import { useImprinter } from "./hooks/use-imprinter";

// ============================================================================
// Math & Transform Logic
// ============================================================================

function calculateDecalTransform(
  targetMesh: THREE.Mesh,
  printArea: string,
  offsetPosition: THREE.Vector3,
): { position: THREE.Vector3; orientation: THREE.Euler } {
  const raycaster = new THREE.Raycaster();

  const box = new THREE.Box3().setFromObject(targetMesh);
  const meshCenter = box.getCenter(new THREE.Vector3());
  const meshSize = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(meshSize.x, meshSize.y, meshSize.z);

  let rayDirection: THREE.Vector3;
  switch (printArea) {
    case "back":
      rayDirection = new THREE.Vector3(0, 0, -1);
      break;
    case "left-sleeve":
      rayDirection = new THREE.Vector3(-1, 0, 0);
      break;
    case "right-sleeve":
      rayDirection = new THREE.Vector3(1, 0, 0);
      break;
    case "front":
    default:
      rayDirection = new THREE.Vector3(0, 0, 1);
      break;
  }

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

// ============================================================================
// Components
// ============================================================================

function DesignDecal({
  design,
  targetMesh,
  maxAnisotropy,
}: {
  design: AppliedDesign;
  targetMesh: THREE.Mesh;
  maxAnisotropy: number;
}) {
  const textureUrl = design.designData.coverId ? `/assets/${design.designData.coverId}/view` : null;
  // We use useTexture from drei which suspends, but we need to handle key change or null
  // Ideally we put this in a Suspense, but for simplicity we can use straight texture loader if we want manual control
  // Or just use useTexture safely.

  // Note: useTexture throws if url is null/empty.
  if (!textureUrl) return null;

  return <DecalMesh design={design} url={textureUrl} targetMesh={targetMesh} />;
}

function DecalMesh({ design, url, targetMesh }: { design: AppliedDesign; url: string; targetMesh: THREE.Mesh }) {
  const texture = useTexture(url);

  // Configuration
  const { position, orientation } = useMemo(() => {
    const offset = new THREE.Vector3(
      design.transform.position[0],
      design.transform.position[1],
      design.transform.position[2],
    );
    return calculateDecalTransform(targetMesh, design.printArea, offset);
  }, [targetMesh, design.printArea, design.transform.position]);

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
    <Decal
      position={position}
      rotation={finalOrientation}
      scale={scale}
      mesh={targetMesh} // Optional: ensures coordinate system alignment if portal is funky
    >
      <meshStandardMaterial
        map={texture}
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

function TShirtModel() {
  const { productColor, appliedDesigns } = useImprinter();
  // Using scene.gltf as requested for compatibility
  const { scene } = useGLTF("/models/scene.gltf");
  const { gl } = useThree();
  const modelRef = useRef<THREE.Group>(null);
  const [primaryMesh, setPrimaryMesh] = useState<THREE.Mesh | null>(null);
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  // Find Primary Mesh (Shirt Surface)
  useEffect(() => {
    if (!modelRef.current) return;

    const box = new THREE.Box3().setFromObject(modelRef.current);
    const center = box.getCenter(new THREE.Vector3());
    modelRef.current.position.sub(center);

    let largestMesh: THREE.Mesh | null = null;
    let maxDimension = 0;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.color = new THREE.Color(productColor);
        }

        // Logic to find the main shirt mesh
        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        if (bbox) {
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const dimension = size.length();

          if (dimension > maxDimension) {
            maxDimension = dimension;
            largestMesh = child;
          }
        }
      }
    });

    if (!largestMesh) {
      // Fallback
      scene.traverse((child) => {
        if (!largestMesh && child instanceof THREE.Mesh) {
          largestMesh = child;
        }
      });
    }

    if (largestMesh) {
      setPrimaryMesh(largestMesh);
    }
  }, [scene, productColor]);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.updateMatrixWorld(true);
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={scene} />

      {/* Use createPortal to render Decals INSIDE the primary mesh's coordinate system */}
      {primaryMesh &&
        createPortal(
          <>
            {appliedDesigns.map((design) => (
              <DesignDecal key={design.id} design={design} targetMesh={primaryMesh} maxAnisotropy={maxAnisotropy} />
            ))}
          </>,
          primaryMesh,
        )}
    </group>
  );
}

export function ImprinterScene() {
  return (
    <div className="h-full w-full">
      <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <ambientLight intensity={0.6} />
        <spotLight position={[5, 5, 5]} angle={0.3} penumbra={1} intensity={1} castShadow />
        <spotLight position={[-5, 5, 5]} angle={0.3} penumbra={1} intensity={0.5} />
        <directionalLight position={[0, 5, 0]} intensity={0.3} />
        <Environment preset="studio" />
        <TShirtModel />
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
  );
}

useGLTF.preload("/models/scene.gltf");

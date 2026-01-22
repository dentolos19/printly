"use client";

import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useImprinter } from "./hooks/use-imprinter";

function DesignDecal({ design }: { design: any }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Load the design as a texture
  const textureUrl = design.designData.coverId ? `/assets/${design.designData.coverId}/view` : null;

  if (!textureUrl) return null;

  return (
    <mesh
      ref={meshRef}
      position={[design.transform.position[0], design.transform.position[1], design.transform.position[2] + 0.01]}
      rotation={design.transform.rotation}
      scale={design.transform.scale}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={new THREE.TextureLoader().load(textureUrl)}
        transparent
        opacity={design.opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function TShirtModel() {
  const { productColor, appliedDesigns } = useImprinter();
  const { scene } = useGLTF("/models/tshirt.glb");
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Center the model
    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      modelRef.current.position.sub(center);
    }

    // Apply product color
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.color = new THREE.Color(productColor);
        }
      }
    });
  }, [scene, productColor]);

  return (
    <group ref={modelRef}>
      <primitive object={scene} />
      {appliedDesigns.map((design) => (
        <DesignDecal key={design.id} design={design} />
      ))}
    </group>
  );
}

export function ImprinterScene() {
  return (
    <div className="h-full w-full">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
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
          minDistance={1.5}
          maxDistance={8}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/tshirt.glb");

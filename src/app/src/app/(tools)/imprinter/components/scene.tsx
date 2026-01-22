"use client";

import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useImprinter } from "./hooks/use-imprinter";

function TShirtModel() {
  const { productColor, appliedDesigns } = useImprinter();
  const { scene } = useGLTF("/models/tshirt.glb");

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.color = new THREE.Color(productColor);
        }
      }
    });
  }, [scene, productColor]);

  return <primitive object={scene} />;
}

export function ImprinterScene() {
  return (
    <div className="h-full w-full">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
        <spotLight position={[-10, -10, -10]} angle={0.3} penumbra={1} intensity={0.5} />
        <Environment preset="studio" />
        <TShirtModel />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={2} maxDistance={10} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/tshirt.glb");

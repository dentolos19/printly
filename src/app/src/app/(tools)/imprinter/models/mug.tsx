import { useGLTF } from "@react-three/drei";
import { ComponentProps } from "react";

export function Mug(props: ComponentProps<"group">) {
  const { nodes, materials }: { nodes: any; materials: any } = useGLTF("/models/mug.glb");
  return (
    <group {...props} dispose={null}>
      <mesh castShadow receiveShadow geometry={nodes.Object_4.geometry} material={materials["Scene_-_Root"]} />
      <mesh castShadow receiveShadow geometry={nodes.Object_5.geometry} material={materials["Scene_-_Root"]} />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_7.geometry}
        material={materials["Scene_-_Root"]}
        position={[0, 0.73, 1.065]}
        scale={[0.226, 0.068, 0.206]}
      />
    </group>
  );
}

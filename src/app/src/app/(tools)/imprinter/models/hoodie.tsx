import { useGLTF } from "@react-three/drei";
import { ComponentProps } from "react";

export function Hoodie(props: ComponentProps<"group">) {
  const { nodes, materials }: { nodes: any; materials: any } = useGLTF("/models/hoodie.glb");
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh castShadow receiveShadow geometry={nodes.Object_2.geometry} material={materials["Material238904.005"]} />
        <mesh castShadow receiveShadow geometry={nodes.Object_3.geometry} material={materials["Material238904.005"]} />
        <mesh castShadow receiveShadow geometry={nodes.Object_4.geometry} material={materials["Material238904.005"]} />
        <mesh castShadow receiveShadow geometry={nodes.Object_5.geometry} material={materials["Material238904.005"]} />
      </group>
    </group>
  );
}

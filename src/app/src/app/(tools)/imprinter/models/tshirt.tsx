import { useGLTF } from "@react-three/drei";
import { ComponentProps } from "react";

export function TShirt(props: ComponentProps<"group">) {
  const { nodes, materials }: { nodes: any; materials: any } = useGLTF("/models/tshirt.glb");
  return (
    <group {...props} dispose={null}>
      <mesh castShadow receiveShadow geometry={nodes.Object_6.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_8.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_10.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_11.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_12.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_14.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_15.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_16.geometry} material={materials.Body_FRONT_2664} />
      <mesh castShadow receiveShadow geometry={nodes.Object_18.geometry} material={materials.Sleeves_FRONT_2669} />
      <mesh castShadow receiveShadow geometry={nodes.Object_20.geometry} material={materials.Sleeves_FRONT_2669} />
    </group>
  );
}

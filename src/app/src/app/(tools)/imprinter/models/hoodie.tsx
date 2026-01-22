import { useGLTF } from "@react-three/drei";
import { ComponentProps } from "react";

export function Hoodie(props: ComponentProps<"group">) {
  const { nodes, materials }: { nodes: any; materials: any } = useGLTF("/models/hoodie.glb");
  return (
    <group {...props} dispose={null}>
      <group scale={0.001}>
        <group scale={10}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Hoodie_FABRIC_3_FRONT_1850_0.geometry}
            material={materials.FABRIC_3_FRONT_1850}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Hoodie_FABRIC_3_FRONT_1850_0_1.geometry}
            material={materials.FABRIC_3_FRONT_1850}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Hoodie_FABRIC_3_FRONT_1850_0_2.geometry}
            material={materials.FABRIC_3_FRONT_1850}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Hoodie_FABRIC_3_FRONT_1850_0_3.geometry}
            material={materials.FABRIC_3_FRONT_1850}
          />
        </group>
      </group>
    </group>
  );
}

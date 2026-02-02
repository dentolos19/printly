import * as THREE from "three";
import type { DetectedPrintArea } from "../types";

// Naming conventions for print area detection
const PRINT_AREA_PATTERNS = [
  // Exact matches like "PrintArea_Front"
  { pattern: /^PrintArea[_-]?(.+)$/i, nameExtractor: (match: RegExpMatchArray) => formatAreaName(match[1]) },
  // Mesh names like "front_print" or "back_printable"
  { pattern: /^(.+)[_-]?print(?:able)?$/i, nameExtractor: (match: RegExpMatchArray) => formatAreaName(match[1]) },
  // Mesh names like "print_front" or "printarea_back"
  { pattern: /^print(?:area)?[_-]?(.+)$/i, nameExtractor: (match: RegExpMatchArray) => formatAreaName(match[1]) },
];

// Standard area IDs with common variations
const AREA_ID_MAP: Record<string, string> = {
  front: "front",
  frente: "front",
  forward: "front",
  back: "back",
  rear: "back",
  behind: "back",
  atras: "back",
  left: "left-sleeve",
  "left sleeve": "left-sleeve",
  "left-sleeve": "left-sleeve",
  leftsleeve: "left-sleeve",
  right: "right-sleeve",
  "right sleeve": "right-sleeve",
  "right-sleeve": "right-sleeve",
  rightsleeve: "right-sleeve",
  sleeve: "sleeve",
  chest: "front",
  pocket: "pocket",
  collar: "collar",
  hood: "hood",
  bottom: "bottom",
  top: "top",
};

function formatAreaName(raw: string): string {
  return raw
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

function normalizeAreaId(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, value] of Object.entries(AREA_ID_MAP)) {
    if (normalized.includes(key.replace(/[^a-z0-9]/g, ""))) {
      return value;
    }
  }
  return name.toLowerCase().replace(/\s+/g, "-");
}

function computeMeshNormal(mesh: THREE.Mesh): THREE.Vector3 {
  const geometry = mesh.geometry;

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  const normals = geometry.attributes.normal;
  const avgNormal = new THREE.Vector3();

  for (let i = 0; i < normals.count; i++) {
    avgNormal.x += normals.getX(i);
    avgNormal.y += normals.getY(i);
    avgNormal.z += normals.getZ(i);
  }

  avgNormal.divideScalar(normals.count);
  avgNormal.normalize();

  // Transform to world space
  const worldNormal = avgNormal.clone();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  worldNormal.applyMatrix3(normalMatrix).normalize();

  return worldNormal;
}

function computeRayDirection(normal: THREE.Vector3): [number, number, number] {
  // Ray direction should point toward the surface (opposite of normal)
  return [-normal.x, -normal.y, -normal.z];
}

export function detectPrintAreasFromModel(scene: THREE.Group | THREE.Object3D): DetectedPrintArea[] {
  const detectedAreas: DetectedPrintArea[] = [];
  const seenAreaIds = new Set<string>();

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const meshName = child.name || "";
    if (!meshName) return;

    for (const { pattern, nameExtractor } of PRINT_AREA_PATTERNS) {
      const match = meshName.match(pattern);
      if (match) {
        const areaName = nameExtractor(match);
        const areaId = normalizeAreaId(areaName);

        // Skip duplicates
        if (seenAreaIds.has(areaId)) continue;
        seenAreaIds.add(areaId);

        const meshNormal = computeMeshNormal(child);
        const rayDirection = computeRayDirection(meshNormal);

        detectedAreas.push({
          areaId,
          name: areaName,
          meshName: meshName,
          rayDirection,
          meshNormal: [meshNormal.x, meshNormal.y, meshNormal.z],
        });

        break;
      }
    }
  });

  // Sort by common ordering
  const orderMap: Record<string, number> = {
    front: 0,
    back: 1,
    "left-sleeve": 2,
    "right-sleeve": 3,
  };

  detectedAreas.sort((a, b) => {
    const orderA = orderMap[a.areaId] ?? 999;
    const orderB = orderMap[b.areaId] ?? 999;
    return orderA - orderB;
  });

  return detectedAreas;
}

export function suggestPrintAreasForMesh(mesh: THREE.Mesh): DetectedPrintArea | null {
  const meshNormal = computeMeshNormal(mesh);
  const rayDirection = computeRayDirection(meshNormal);

  // Determine area based on dominant normal direction
  const absX = Math.abs(meshNormal.x);
  const absY = Math.abs(meshNormal.y);
  const absZ = Math.abs(meshNormal.z);

  let suggestedName: string;
  let suggestedId: string;

  if (absZ >= absX && absZ >= absY) {
    // Z-dominant (front/back)
    if (meshNormal.z > 0) {
      suggestedName = "Front";
      suggestedId = "front";
    } else {
      suggestedName = "Back";
      suggestedId = "back";
    }
  } else if (absX >= absY) {
    // X-dominant (left/right sleeve)
    if (meshNormal.x < 0) {
      suggestedName = "Left Side";
      suggestedId = "left-side";
    } else {
      suggestedName = "Right Side";
      suggestedId = "right-side";
    }
  } else {
    // Y-dominant (top/bottom)
    if (meshNormal.y > 0) {
      suggestedName = "Top";
      suggestedId = "top";
    } else {
      suggestedName = "Bottom";
      suggestedId = "bottom";
    }
  }

  return {
    areaId: suggestedId,
    name: suggestedName,
    meshName: mesh.name || "unknown",
    rayDirection,
    meshNormal: [meshNormal.x, meshNormal.y, meshNormal.z],
  };
}

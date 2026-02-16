"use client";

import { useCallback, useRef, useState } from "react";
import { PLACEHOLDER_SVG } from "../../shared/components/fallback-image";
import type { AppliedDesign, PrintAreaConfig } from "../types";
import { useImprinter } from "./hooks/use-imprinter";

type DragState = {
  designId: string;
  originalPrintArea: string;
  startX: number;
  startY: number;
  initialPosition: [number, number, number];
} | null;

const CANVAS_SIZE = 600;
const PRINT_AREA_SIZE = 200;
const PRINT_AREA_GAP = 40;

function getPrintAreaPosition(index: number, total: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;

  const totalWidth = cols * PRINT_AREA_SIZE + (cols - 1) * PRINT_AREA_GAP;
  const totalHeight = Math.ceil(total / cols) * PRINT_AREA_SIZE + (Math.ceil(total / cols) - 1) * PRINT_AREA_GAP;

  const startX = (CANVAS_SIZE - totalWidth) / 2;
  const startY = (CANVAS_SIZE - totalHeight) / 2;

  return {
    x: startX + col * (PRINT_AREA_SIZE + PRINT_AREA_GAP),
    y: startY + row * (PRINT_AREA_SIZE + PRINT_AREA_GAP),
  };
}

function DesignItem({
  design,
  printArea,
  printAreaPosition,
  isSelected,
  onSelect,
  onDragStart,
}: {
  design: AppliedDesign;
  printArea: PrintAreaConfig | undefined;
  printAreaPosition: { x: number; y: number };
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, design: AppliedDesign) => void;
}) {
  const designSize = 60 * design.transform.scale[0];
  const offsetX = design.transform.position[0] * 50;
  const offsetY = -design.transform.position[1] * 50;

  const x = printAreaPosition.x + PRINT_AREA_SIZE / 2 + offsetX - designSize / 2;
  const y = printAreaPosition.y + PRINT_AREA_SIZE / 2 + offsetY - designSize / 2;

  const coverId = design.designData?.coverId;
  if (!coverId) return null;
  const imageHref = coverId.startsWith("blob:") || coverId.startsWith("data:") ? coverId : `/assets/${coverId}/view`;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <g
      className="cursor-move"
      onMouseDown={(e) => {
        onSelect();
        onDragStart(e, design);
      }}
    >
      <image
        href={imgFailed ? PLACEHOLDER_SVG : imageHref}
        onError={() => setImgFailed(true)}
        x={x}
        y={y}
        width={designSize}
        height={designSize}
        opacity={design.opacity}
        style={{
          transform: `rotate(${design.transform.rotation[2]}rad)`,
          transformOrigin: `${x + designSize / 2}px ${y + designSize / 2}px`,
        }}
      />
      {isSelected && (
        <rect
          x={x - 2}
          y={y - 2}
          width={designSize + 4}
          height={designSize + 4}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}
    </g>
  );
}

function PrintAreaBox({
  printArea,
  position,
  designs,
  selectedDesignId,
  onSelectDesign,
  onDragStart,
}: {
  printArea: PrintAreaConfig;
  position: { x: number; y: number };
  designs: AppliedDesign[];
  selectedDesignId: string | null;
  onSelectDesign: (id: string) => void;
  onDragStart: (e: React.MouseEvent, design: AppliedDesign) => void;
}) {
  return (
    <g>
      <rect
        x={position.x}
        y={position.y}
        width={PRINT_AREA_SIZE}
        height={PRINT_AREA_SIZE}
        fill="hsl(var(--muted))"
        stroke="hsl(var(--border))"
        strokeWidth={1}
        rx={8}
      />
      <text
        x={position.x + PRINT_AREA_SIZE / 2}
        y={position.y + 20}
        textAnchor="middle"
        className="fill-muted-foreground text-xs font-medium"
      >
        {printArea.name}
      </text>
      {designs.map((design) => (
        <DesignItem
          key={design.id}
          design={design}
          printArea={printArea}
          printAreaPosition={position}
          isSelected={design.id === selectedDesignId}
          onSelect={() => onSelectDesign(design.id)}
          onDragStart={onDragStart}
        />
      ))}
    </g>
  );
}

export function Imprinter2DView() {
  const {
    appliedDesigns,
    availablePrintAreas,
    selectedDesignId,
    selectDesign,
    updateDesignTransform,
    updateDesignPrintArea,
  } = useImprinter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState>(null);

  const printAreaMap = new Map<string, PrintAreaConfig>();
  availablePrintAreas.forEach((pa) => printAreaMap.set(pa.id, pa));

  const designsByPrintArea = new Map<string, AppliedDesign[]>();
  appliedDesigns
    .filter((d) => d.visible !== false)
    .forEach((design) => {
      const list = designsByPrintArea.get(design.printArea) || [];
      list.push(design);
      designsByPrintArea.set(design.printArea, list);
    });

  const printAreaPositions = availablePrintAreas.map((pa, index) => ({
    id: pa.id,
    position: getPrintAreaPosition(index, availablePrintAreas.length),
  }));

  const handleDragStart = useCallback((e: React.MouseEvent, design: AppliedDesign) => {
    e.preventDefault();
    setDragState({
      designId: design.id,
      originalPrintArea: design.printArea,
      startX: e.clientX,
      startY: e.clientY,
      initialPosition: [...design.transform.position],
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;

      const dx = (e.clientX - dragState.startX) / 50;
      const dy = -(e.clientY - dragState.startY) / 50;

      const newPosition: [number, number, number] = [
        dragState.initialPosition[0] + dx,
        dragState.initialPosition[1] + dy,
        dragState.initialPosition[2],
      ];

      updateDesignTransform(dragState.designId, { position: newPosition });
    },
    [dragState, updateDesignTransform],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !svgRef.current) {
        setDragState(null);
        return;
      }

      const svgRect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * CANVAS_SIZE;
      const mouseY = ((e.clientY - svgRect.top) / svgRect.height) * CANVAS_SIZE;

      const targetArea = printAreaPositions.find(
        ({ position }) =>
          mouseX >= position.x &&
          mouseX <= position.x + PRINT_AREA_SIZE &&
          mouseY >= position.y &&
          mouseY <= position.y + PRINT_AREA_SIZE,
      );

      if (targetArea && targetArea.id !== dragState.originalPrintArea) {
        updateDesignPrintArea(dragState.designId, targetArea.id);
      }

      setDragState(null);
    },
    [dragState, printAreaPositions, updateDesignPrintArea],
  );

  const handleMouseLeave = useCallback(() => {
    setDragState(null);
  }, []);

  if (availablePrintAreas.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">No print areas available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-900">
      <svg
        ref={svgRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        className="rounded-lg bg-white shadow-lg dark:bg-neutral-800"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {availablePrintAreas.map((printArea, index) => {
          const position = getPrintAreaPosition(index, availablePrintAreas.length);
          const designs = designsByPrintArea.get(printArea.id) || [];

          return (
            <PrintAreaBox
              key={printArea.id}
              printArea={printArea}
              position={position}
              designs={designs}
              selectedDesignId={selectedDesignId}
              onSelectDesign={selectDesign}
              onDragStart={handleDragStart}
            />
          );
        })}
      </svg>
    </div>
  );
}

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Layers, Settings2, Shapes } from "lucide-react";
import { AssetsPanel } from "./sidebar/assets-panel";
import { LayersPanel } from "./sidebar/layers-panel";
import { PropertiesPanel } from "./sidebar/properties-panel";

type DesignerSidebarProps = {
  className?: string;
};

export const DesignerSidebar = ({ className }: DesignerSidebarProps) => {
  return (
    <div className={cn("bg-background flex h-full flex-col border-l", className)}>
      <Tabs defaultValue={"properties"} className={"flex h-full flex-col"}>
        <TabsList className={"grid h-10 w-full grid-cols-3 rounded-none border-b"}>
          <TabsTrigger value={"properties"} className={"gap-1.5 rounded-none data-[state=active]:shadow-none"}>
            <Settings2 className={"h-4 w-4"} />
            <span className={"hidden sm:inline"}>Properties</span>
          </TabsTrigger>
          <TabsTrigger value={"layers"} className={"gap-1.5 rounded-none data-[state=active]:shadow-none"}>
            <Layers className={"h-4 w-4"} />
            <span className={"hidden sm:inline"}>Layers</span>
          </TabsTrigger>
          <TabsTrigger value={"assets"} className={"gap-1.5 rounded-none data-[state=active]:shadow-none"}>
            <Shapes className={"h-4 w-4"} />
            <span className={"hidden sm:inline"}>Assets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"properties"} className={"mt-0 flex-1 overflow-hidden"}>
          <PropertiesPanel />
        </TabsContent>

        <TabsContent value={"layers"} className={"mt-0 flex-1 overflow-hidden"}>
          <LayersPanel />
        </TabsContent>

        <TabsContent value={"assets"} className={"mt-0 flex-1 overflow-hidden"}>
          <AssetsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

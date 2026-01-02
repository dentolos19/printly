"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useServer } from "@/lib/providers/server";
import type { Design } from "@/lib/server/design";
import {
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  FileTextIcon,
  ImageIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Page() {
  const { api } = useServer();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  useEffect(() => {
    api.design
      .getDesigns()
      .then((data) => {
        setDesigns(data.slice(0, 5));
      })
      .catch((error) => {
        console.error("Failed to load designs:", error);
      })
      .finally(() => {
        setLoadingDesigns(false);
      });
  }, [api.design]);
  return (
    <div className={"p-6"}>
      <div className={"mb-6 flex gap-4 *:flex-1 max-md:flex-col"}>
        <Card>
          <CardContent>
            <div className={"bg-primary mb-2 flex size-10 items-center justify-center rounded-lg"}>
              <PackageIcon className={"text-primary-foreground size-6"} />
            </div>
            <h2 className={"mb-2 text-lg"}>Active Orders</h2>
            <p className={"text-primary text-2xl font-bold"}>0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className={"bg-primary mb-2 flex size-10 items-center justify-center rounded-lg"}>
              <ClockIcon className={"text-primary-foreground size-6"} />
            </div>
            <h2 className={"mb-2 text-lg"}>In Production</h2>
            <p className={"text-primary text-2xl font-bold"}>0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className={"bg-primary mb-2 flex size-10 items-center justify-center rounded-lg"}>
              <CheckIcon className={"text-primary-foreground size-6"} />
            </div>
            <h2 className={"mb-2 text-lg"}>Completed Orders</h2>
            <p className={"text-primary text-2xl font-bold"}>0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className={"bg-primary mb-2 flex size-10 items-center justify-center rounded-lg"}>
              <CoinsIcon className={"text-primary-foreground size-6"} />
            </div>
            <h2 className={"mb-2 text-lg"}>Total Spent</h2>
            <p className={"text-primary text-2xl font-bold"}>0</p>
          </CardContent>
        </Card>
      </div>

      <div className={"flex gap-6 max-md:flex-col-reverse"}>
        <div className={"flex-1 space-y-6"}>
          <div>
            <div className={"mb-4 flex items-center justify-between"}>
              <h2 className={"text-2xl font-semibold"}>Recent Designs</h2>
              <Button asChild variant={"link"}>
                <Link href={"/designs"}>View All</Link>
              </Button>
            </div>
            <div className={"space-y-4"}>
              {loadingDesigns ? (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Item key={i} variant={"outline"}>
                      <ItemMedia>
                        <Skeleton className={"size-full"} />
                      </ItemMedia>
                      <ItemContent>
                        <Skeleton className={"mb-2 h-5 w-32"} />
                        <Skeleton className={"h-4 w-48"} />
                      </ItemContent>
                    </Item>
                  ))}
                </>
              ) : designs.length > 0 ? (
                designs.map((design) => (
                  <Item key={design.id} variant={"outline"} asChild>
                    <Link href={`/designer/${design.id}`}>
                      <ItemMedia>
                        <FileTextIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{design.name}</ItemTitle>
                        <ItemDescription>{design.description || "No description"}</ItemDescription>
                      </ItemContent>
                      <ItemActions />
                    </Link>
                  </Item>
                ))
              ) : (
                <Item variant={"outline"}>
                  <ItemContent>
                    <ItemDescription>No designs yet. Create your first design to get started!</ItemDescription>
                  </ItemContent>
                </Item>
              )}
            </div>
          </div>
          <div>
            <div className={"mb-4 flex items-center justify-between"}>
              <h2 className={"text-2xl font-semibold"}>Recent Orders</h2>
              <Button asChild variant={"link"}>
                <Link href={"/orders"}>View All</Link>
              </Button>
            </div>
            <div className={"space-y-4"}>Todo</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className={"mb-4 text-2xl font-semibold"}>Quick Actions</h2>
          <div className={"space-y-4"}>
            <Item variant={"outline"} asChild>
              <Link href={"/designer/new"}>
                <ItemMedia>
                  <PlusIcon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Create New Design</ItemTitle>
                  <ItemDescription>Build a new design for anything!</ItemDescription>
                </ItemContent>
                <ItemActions />
              </Link>
            </Item>
            <Item variant={"outline"} asChild>
              <Link href={"/assets"}>
                <ItemMedia>
                  <ImageIcon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Manage My Assets</ItemTitle>
                  <ItemDescription>Manage your design assets and resources.</ItemDescription>
                </ItemContent>
                <ItemActions />
              </Link>
            </Item>
            <Item variant={"outline"} asChild>
              <Link href={"/contact"}>
                <ItemMedia>
                  <PhoneIcon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Contact Support</ItemTitle>
                  <ItemDescription>Get help and support for your account.</ItemDescription>
                </ItemContent>
                <ItemActions />
              </Link>
            </Item>
          </div>
        </div>
      </div>
    </div>
  );
}

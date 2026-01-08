"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useServer } from "@/lib/providers/server";
import { AiSalesAnalysisResponse } from "@/lib/server/analysis";
import { AdminOrderStatsResponse, MonthlyRevenueData, OrderStatusData } from "@/lib/server/order";
import {
  AlertTriangle,
  Box,
  BrainCircuit,
  CheckCircle2,
  DollarSign,
  Layers,
  Loader2,
  Package,
  PackageX,
  ShoppingCart,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type DashboardStats = {
  totalProducts: number;
  activeProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
};

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#22c55e", "#ef4444"];

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  color,
  loading,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  loading: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`size-4 ${color}`} />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
              <CardDescription>{description}</CardDescription>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function RevenueChart({ data, loading }: { data: MonthlyRevenueData[]; loading: boolean }) {
  const formattedData = data.map((d) => ({
    ...d,
    monthLabel: new Date(d.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  }));

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Monthly revenue for the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <XAxis dataKey="monthLabel" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function OrdersChart({ data, loading }: { data: MonthlyRevenueData[]; loading: boolean }) {
  const formattedData = data.map((d) => ({
    ...d,
    monthLabel: new Date(d.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Trends</CardTitle>
        <CardDescription>Number of orders per month</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <XAxis dataKey="monthLabel" />
              <YAxis />
              <Tooltip labelFormatter={(label) => `Month: ${label}`} />
              <Line type="monotone" dataKey="orderCount" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function StatusDistributionChart({ data, loading }: { data: OrderStatusData[]; loading: boolean }) {
  const filteredData = data.filter((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status Distribution</CardTitle>
        <CardDescription>Current breakdown of order statuses</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : filteredData.length === 0 ? (
          <div className="text-muted-foreground flex h-[300px] items-center justify-center">No orders yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
                label={({ status, count }) => `${status}: ${count}`}
                labelLine={false}
              >
                {filteredData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const { api } = useServer();
  const [inventoryStats, setInventoryStats] = useState<DashboardStats | null>(null);
  const [orderStats, setOrderStats] = useState<AdminOrderStatsResponse | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AiSalesAnalysisResponse | null>(null);
  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingInventory(true);
    setLoadingOrders(true);

    try {
      const [products, stockInfo] = await Promise.all([api.product.getProducts(), api.inventory.getTotalStock()]);

      setInventoryStats({
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.isActive).length,
        totalVariants: stockInfo.totalVariants,
        totalStock: stockInfo.totalStock,
        lowStockCount: stockInfo.lowStockCount,
        outOfStockCount: stockInfo.outOfStockCount,
      });
    } catch (error) {
      toast.error("Failed to load inventory statistics");
      console.error(error);
    } finally {
      setLoadingInventory(false);
    }

    try {
      const stats = await api.order.getAdminOrderStats();
      setOrderStats(stats);
    } catch (error) {
      toast.error("Failed to load order statistics");
      console.error(error);
    } finally {
      setLoadingOrders(false);
    }
  }, [api]);

  const handleGetAiAnalysis = useCallback(async () => {
    setLoadingAiAnalysis(true);
    setAiDialogOpen(true);
    try {
      const analysis = await api.analysis.getAiSalesAnalysis();
      setAiAnalysis(analysis);
    } catch (error) {
      toast.error("Failed to generate AI analysis");
      console.error(error);
      setAiDialogOpen(false);
    } finally {
      setLoadingAiAnalysis(false);
    }
  }, [api]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const inventoryCards = [
    {
      title: "Total Products",
      value: inventoryStats?.totalProducts ?? 0,
      description: `${inventoryStats?.activeProducts ?? 0} active`,
      icon: Package,
      href: "/admin/products",
      color: "text-blue-500",
    },
    {
      title: "Total Variants",
      value: inventoryStats?.totalVariants ?? 0,
      description: "Product variations",
      icon: Layers,
      href: "/admin/variants",
      color: "text-purple-500",
    },
    {
      title: "Total Stock",
      value: inventoryStats?.totalStock ?? 0,
      description: "Items in inventory",
      icon: Box,
      href: "/admin/inventory",
      color: "text-green-500",
    },
    {
      title: "Low Stock",
      value: inventoryStats?.lowStockCount ?? 0,
      description: "Below reorder level",
      icon: AlertTriangle,
      href: "/admin/inventory?filter=low-stock",
      color: "text-yellow-500",
    },
    {
      title: "Out of Stock",
      value: inventoryStats?.outOfStockCount ?? 0,
      description: "Zero quantity",
      icon: PackageX,
      href: "/admin/inventory?filter=out-of-stock",
      color: "text-red-500",
    },
  ];

  const orderCards = [
    {
      title: "Total Orders",
      value: orderStats?.totalOrders ?? 0,
      description: "All time",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "text-blue-500",
    },
    {
      title: "Total Revenue",
      value: `$${(orderStats?.totalRevenue ?? 0).toFixed(2)}`,
      description: "All time sales",
      icon: DollarSign,
      href: "/admin/orders",
      color: "text-green-500",
    },
    {
      title: "Pending",
      value: orderStats?.pendingOrders ?? 0,
      description: "Awaiting payment",
      icon: AlertTriangle,
      href: "/admin/orders?status=0",
      color: "text-yellow-500",
    },
    {
      title: "Processing",
      value: orderStats?.processingOrders ?? 0,
      description: "Being prepared",
      icon: Package,
      href: "/admin/orders?status=2",
      color: "text-purple-500",
    },
    {
      title: "Shipped",
      value: orderStats?.shippedOrders ?? 0,
      description: "In transit",
      icon: Truck,
      href: "/admin/orders?status=3",
      color: "text-indigo-500",
    },
    {
      title: "Completed",
      value: orderStats?.completedOrders ?? 0,
      description: "Delivered",
      icon: CheckCircle2,
      href: "/admin/orders?status=4",
      color: "text-green-500",
    },
    {
      title: "Cancelled",
      value: orderStats?.cancelledOrders ?? 0,
      description: "Cancelled orders",
      icon: XCircle,
      href: "/admin/orders?status=5",
      color: "text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your store performance</p>
        </div>
        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleGetAiAnalysis} className="gap-2" disabled={loadingAiAnalysis}>
              {loadingAiAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Get AI Analysis
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BrainCircuit className="text-primary h-5 w-5" />
                AI Sales Analysis
              </DialogTitle>
              <DialogDescription>
                {aiAnalysis
                  ? `Generated at ${new Date(aiAnalysis.generatedAt).toLocaleString()}`
                  : "Analyzing your business data..."}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {loadingAiAnalysis ? (
                <div className="space-y-4 py-4">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing sales data, orders, inventory, and trends...</span>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-sm dark:prose-invert max-w-none py-4">
                  <ReactMarkdown>{aiAnalysis.analysis}</ReactMarkdown>
                </div>
              ) : null}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Order Stats */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Order Statistics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {orderCards.map((card) => (
            <StatCard key={card.title} {...card} loading={loadingOrders} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart data={orderStats?.monthlyRevenue ?? []} loading={loadingOrders} />
        <OrdersChart data={orderStats?.monthlyRevenue ?? []} loading={loadingOrders} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusDistributionChart data={orderStats?.statusDistribution ?? []} loading={loadingOrders} />

        {/* Inventory Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Overview</CardTitle>
            <CardDescription>Quick look at your product inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inventoryCards.slice(0, 5).map((card) => (
                <Link key={card.title} href={card.href} className="block">
                  <div className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors">
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                    <div>
                      {loadingInventory ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        <p className="text-lg font-bold">{card.value}</p>
                      )}
                      <p className="text-muted-foreground text-xs">{card.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

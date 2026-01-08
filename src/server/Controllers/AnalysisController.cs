using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("analysis")]
[Authorize(Roles = Roles.Admin)]
public class AnalysisController(DatabaseContext context, GenerativeService generativeService) : BaseController(context)
{
    /// <summary>
    /// Get AI-generated sales analysis for the business
    /// </summary>
    [HttpGet("sales")]
    public async Task<ActionResult<AiSalesAnalysisResponse>> GetAiSalesAnalysis()
    {
        // Gather comprehensive data for analysis
        var orders = await Context
            .Orders.Include(o => o.Items)
                .ThenInclude(i => i.Variant)
                    .ThenInclude(v => v.Product)
            .ToListAsync();

        var products = await Context.Products.Include(p => p.Variants).ThenInclude(v => v.Inventory).ToListAsync();

        // Calculate key metrics
        var totalOrders = orders.Count;
        var completedOrders = orders.Count(o => o.Status == OrderStatus.Delivered);
        var cancelledOrders = orders.Count(o => o.Status == OrderStatus.Cancelled);
        var pendingOrders = orders.Count(o =>
            o.Status == OrderStatus.PendingPayment || o.Status == OrderStatus.Paid || o.Status == OrderStatus.Processing
        );
        var totalRevenue = orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.TotalAmount);
        var averageOrderValue =
            completedOrders > 0 ? orders.Where(o => o.Status == OrderStatus.Delivered).Average(o => o.TotalAmount) : 0;

        // Monthly breakdown (last 6 months)
        var monthlyData = new List<string>();
        for (var i = 5; i >= 0; i--)
        {
            var date = DateTime.UtcNow.AddMonths(-i);
            var monthOrders = orders.Where(o =>
                o.CreatedAt.Year == date.Year && o.CreatedAt.Month == date.Month && o.Status != OrderStatus.Cancelled
            );
            var monthRevenue = monthOrders.Sum(o => o.TotalAmount);
            var monthCount = monthOrders.Count();
            monthlyData.Add($"- {date:MMMM yyyy}: {monthCount} orders, ${monthRevenue:F2} revenue");
        }

        // Product performance
        var productSales = orders
            .Where(o => o.Status != OrderStatus.Cancelled)
            .SelectMany(o => o.Items)
            .GroupBy(i => i.Variant.Product.Name)
            .Select(g => new
            {
                Product = g.Key,
                TotalQuantity = g.Sum(i => i.Quantity),
                Revenue = g.Sum(i => i.Subtotal),
            })
            .OrderByDescending(p => p.Revenue)
            .Take(10)
            .ToList();

        var productPerformance = string.Join(
            "\n",
            productSales.Select(p => $"- {p.Product}: {p.TotalQuantity} units sold, ${p.Revenue:F2} revenue")
        );

        // Inventory status
        var lowStockProducts = products
            .SelectMany(p => p.Variants)
            .Where(v => v.Inventory != null && v.Inventory.Quantity <= v.Inventory.ReorderLevel)
            .Select(v => $"- {v.Product.Name} ({v.Size}/{v.Color}): {v.Inventory!.Quantity} left")
            .Take(10)
            .ToList();

        var outOfStockCount = products.SelectMany(p => p.Variants).Count(v => v.Inventory?.Quantity == 0);
        var totalProducts = products.Count;
        var activeProducts = products.Count(p => p.IsActive);

        // Order status breakdown
        var statusBreakdown =
            $@"
- Pending Payment: {orders.Count(o => o.Status == OrderStatus.PendingPayment)}
- Paid (awaiting processing): {orders.Count(o => o.Status == OrderStatus.Paid)}
- Processing: {orders.Count(o => o.Status == OrderStatus.Processing)}
- Shipped: {orders.Count(o => o.Status == OrderStatus.Shipped)}
- Delivered: {completedOrders}
- Cancelled: {cancelledOrders}";

        // Calculate cancellation rate
        var cancellationRate = totalOrders > 0 ? (decimal)cancelledOrders / totalOrders * 100 : 0;
        var completionRate = totalOrders > 0 ? (decimal)completedOrders / totalOrders * 100 : 0;

        // Build comprehensive prompt
        var prompt =
            $@"You are a business analyst for Printly, an e-commerce company selling customizable printed products (t-shirts, hoodies, etc.). 

Analyze the following business data and provide a CONCISE analysis:

## SALES OVERVIEW
- Total Orders: {totalOrders}
- Completed Orders: {completedOrders}
- Cancelled Orders: {cancelledOrders}
- Pending/In-Progress Orders: {pendingOrders}
- Total Revenue: ${totalRevenue:F2}
- Average Order Value: ${averageOrderValue:F2}
- Completion Rate: {completionRate:F1}%
- Cancellation Rate: {cancellationRate:F1}%

## MONTHLY PERFORMANCE (Last 6 Months)
{string.Join("\n", monthlyData)}

## TOP SELLING PRODUCTS
{(productPerformance.Length > 0 ? productPerformance : "No sales data available")}

## INVENTORY STATUS
- Total Products: {totalProducts}
- Active Products: {activeProducts}
- Out of Stock Variants: {outOfStockCount}
- Low Stock Items:
{(lowStockProducts.Count > 0 ? string.Join("\n", lowStockProducts) : "No low stock items")}

## ORDER STATUS BREAKDOWN
{statusBreakdown}

Provide a SHORT and CONCISE analysis with the following sections. Use proper markdown heading hierarchy (# for main title, ## for sections). Keep each section to 2-3 bullet points maximum:

# Business Analysis Report

## Executive Summary
(2-3 sentences only)

## Key Strengths
(2-3 bullet points)

## Areas for Improvement
(2-3 bullet points)

## Recommendations
(3-4 actionable bullet points covering sales, inventory, and growth)

IMPORTANT FORMATTING RULES:
- Use ## for all section headings
- Keep bullet points brief (one line each)
- Add TWO blank lines between each section for spacing
- Total response should be under 300 words
- Be direct and actionable, avoid filler words";

        var analysis = await generativeService.GenerateTextAsync(prompt);

        return Ok(new AiSalesAnalysisResponse(analysis, DateTime.UtcNow));
    }
}

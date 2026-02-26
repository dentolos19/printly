using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers;

[Route("print-areas")]
[Authorize]
public class PrintAreaController(DatabaseContext context) : BaseController(context)
{
    /// <summary>
    /// Gets all print areas for a specific product.
    /// </summary>
    [HttpGet("product/{productId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<PrintAreaResponse>>> GetByProduct(Guid productId)
    {
        var product = await Context.Products.FindAsync(productId);
        if (product is null)
            return NotFound(new { message = "Product not found" });

        var printAreas = await Context
            .PrintAreas.Where(p => p.ProductId == productId)
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Name)
            .ToListAsync();

        return Ok(printAreas.Select(ToResponse));
    }

    /// <summary>
    /// Gets a specific print area by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<PrintAreaResponse>> GetPrintArea(Guid id)
    {
        var printArea = await Context.PrintAreas.FindAsync(id);
        if (printArea is null)
            return NotFound(new { message = "Print area not found" });

        return Ok(ToResponse(printArea));
    }

    /// <summary>
    /// Creates a new print area for a product.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PrintAreaResponse>> CreatePrintArea([FromBody] CreatePrintAreaDto dto)
    {
        var product = await Context.Products.FindAsync(dto.ProductId);
        if (product is null)
            return NotFound(new { message = "Product not found" });

        var existingArea = await Context.PrintAreas.FirstOrDefaultAsync(p =>
            p.ProductId == dto.ProductId && p.AreaId == dto.AreaId
        );

        if (existingArea is not null)
            return Conflict(new { message = $"Print area with ID '{dto.AreaId}' already exists for this product" });

        var maxOrder =
            await Context.PrintAreas.Where(p => p.ProductId == dto.ProductId).MaxAsync(p => (int?)p.DisplayOrder) ?? -1;

        var rayDirection = dto.RayDirection ?? [0, 0, 1];

        var printArea = new PrintArea
        {
            ProductId = dto.ProductId,
            AreaId = dto.AreaId,
            Name = dto.Name,
            MeshName = dto.MeshName,
            RayDirectionX = rayDirection.Length > 0 ? rayDirection[0] : 0,
            RayDirectionY = rayDirection.Length > 1 ? rayDirection[1] : 0,
            RayDirectionZ = rayDirection.Length > 2 ? rayDirection[2] : 1,
            DisplayOrder = dto.DisplayOrder ?? maxOrder + 1,
            IsAutoDetected = false,
        };

        Context.PrintAreas.Add(printArea);
        await Context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPrintArea), new { id = printArea.Id }, ToResponse(printArea));
    }

    /// <summary>
    /// Bulk creates print areas for a product (replaces existing).
    /// </summary>
    [HttpPost("bulk")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<PrintAreaResponse>>> BulkCreatePrintAreas(
        [FromBody] BulkCreatePrintAreasDto dto
    )
    {
        var product = await Context.Products.FindAsync(dto.ProductId);
        if (product is null)
            return NotFound(new { message = "Product not found" });

        var existingAreas = await Context.PrintAreas.Where(p => p.ProductId == dto.ProductId).ToListAsync();

        Context.PrintAreas.RemoveRange(existingAreas);

        var printAreas = dto
            .PrintAreas.Select((item, index) =>
                {
                    var rayDirection = item.RayDirection ?? [0, 0, 1];
                    return new PrintArea
                    {
                        ProductId = dto.ProductId,
                        AreaId = item.AreaId,
                        Name = item.Name,
                        MeshName = item.MeshName,
                        RayDirectionX = rayDirection.Length > 0 ? rayDirection[0] : 0,
                        RayDirectionY = rayDirection.Length > 1 ? rayDirection[1] : 0,
                        RayDirectionZ = rayDirection.Length > 2 ? rayDirection[2] : 1,
                        DisplayOrder = item.DisplayOrder ?? index,
                        IsAutoDetected = item.IsAutoDetected,
                    };
                }
            )
            .ToList();

        Context.PrintAreas.AddRange(printAreas);
        await Context.SaveChangesAsync();

        return Ok(printAreas.Select(ToResponse));
    }

    /// <summary>
    /// Updates an existing print area.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PrintAreaResponse>> UpdatePrintArea(Guid id, [FromBody] UpdatePrintAreaDto dto)
    {
        var printArea = await Context.PrintAreas.FindAsync(id);
        if (printArea is null)
            return NotFound(new { message = "Print area not found" });

        if (dto.AreaId is not null)
        {
            var existingArea = await Context.PrintAreas.FirstOrDefaultAsync(p =>
                p.ProductId == printArea.ProductId && p.AreaId == dto.AreaId && p.Id != id
            );

            if (existingArea is not null)
                return Conflict(new { message = $"Print area with ID '{dto.AreaId}' already exists for this product" });

            printArea.AreaId = dto.AreaId;
        }

        if (dto.Name is not null)
            printArea.Name = dto.Name;

        if (dto.MeshName is not null)
            printArea.MeshName = dto.MeshName;

        if (dto.RayDirection is not null && dto.RayDirection.Length >= 3)
        {
            printArea.RayDirectionX = dto.RayDirection[0];
            printArea.RayDirectionY = dto.RayDirection[1];
            printArea.RayDirectionZ = dto.RayDirection[2];
        }

        if (dto.DisplayOrder.HasValue)
            printArea.DisplayOrder = dto.DisplayOrder.Value;

        printArea.IsAutoDetected = false;
        printArea.UpdatedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        return Ok(ToResponse(printArea));
    }

    /// <summary>
    /// Deletes a print area.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeletePrintArea(Guid id)
    {
        var printArea = await Context.PrintAreas.FindAsync(id);
        if (printArea is null)
            return NotFound(new { message = "Print area not found" });

        Context.PrintAreas.Remove(printArea);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Deletes all print areas for a product.
    /// </summary>
    [HttpDelete("product/{productId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteAllForProduct(Guid productId)
    {
        var printAreas = await Context.PrintAreas.Where(p => p.ProductId == productId).ToListAsync();

        Context.PrintAreas.RemoveRange(printAreas);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    private static PrintAreaResponse ToResponse(PrintArea printArea) =>
        new(
            printArea.Id,
            printArea.ProductId,
            printArea.AreaId,
            printArea.Name,
            printArea.MeshName,
            [printArea.RayDirectionX, printArea.RayDirectionY, printArea.RayDirectionZ],
            printArea.DisplayOrder,
            printArea.IsAutoDetected,
            printArea.CreatedAt,
            printArea.UpdatedAt
        );
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintlyServer.Migrations
{
    /// <inheritdoc />
    public partial class LinkImprintToOrderItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ImprintId",
                table: "OrderItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomizationPrice",
                table: "Imprints",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "ProductId",
                table: "Imprints",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ImprintId",
                table: "OrderItems",
                column: "ImprintId");

            migrationBuilder.CreateIndex(
                name: "IX_Imprints_ProductId",
                table: "Imprints",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_Imprints_Products_ProductId",
                table: "Imprints",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_Imprints_ImprintId",
                table: "OrderItems",
                column: "ImprintId",
                principalTable: "Imprints",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Imprints_Products_ProductId",
                table: "Imprints");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_Imprints_ImprintId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_ImprintId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_Imprints_ProductId",
                table: "Imprints");

            migrationBuilder.DropColumn(
                name: "ImprintId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "CustomizationPrice",
                table: "Imprints");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "Imprints");
        }
    }
}

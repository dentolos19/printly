using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintlyServer.Migrations
{
    /// <inheritdoc />
    public partial class AddModelPreview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ModelPreviewId",
                table: "Products",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_ModelPreviewId",
                table: "Products",
                column: "ModelPreviewId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Assets_ModelPreviewId",
                table: "Products",
                column: "ModelPreviewId",
                principalTable: "Assets",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_Assets_ModelPreviewId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_ModelPreviewId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ModelPreviewId",
                table: "Products");
        }
    }
}

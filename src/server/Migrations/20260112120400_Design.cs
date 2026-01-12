using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintlyServer.Migrations
{
    /// <inheritdoc />
    public partial class Design : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CoverId",
                table: "Designs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Assets",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Designs_CoverId",
                table: "Designs",
                column: "CoverId");

            migrationBuilder.AddForeignKey(
                name: "FK_Designs_Assets_CoverId",
                table: "Designs",
                column: "CoverId",
                principalTable: "Assets",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Designs_Assets_CoverId",
                table: "Designs");

            migrationBuilder.DropIndex(
                name: "IX_Designs_CoverId",
                table: "Designs");

            migrationBuilder.DropColumn(
                name: "CoverId",
                table: "Designs");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Assets");
        }
    }
}

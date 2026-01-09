using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintlyServer.Migrations
{
    /// <inheritdoc />
    public partial class VariantColorStringAndImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Convert existing integer Color values to string names before changing column type
            // 0 = Black, 1 = White, 2 = Red, 3 = Blue, 4 = Green, 5 = Yellow, 6 = Purple, 7 = Orange, 8 = Pink, 9 = Gray, 10 = Navy
            migrationBuilder.Sql(@"
                UPDATE ProductVariants SET Color = 
                    CASE Color
                        WHEN '0' THEN 'Black'
                        WHEN '1' THEN 'White'
                        WHEN '2' THEN 'Red'
                        WHEN '3' THEN 'Blue'
                        WHEN '4' THEN 'Green'
                        WHEN '5' THEN 'Yellow'
                        WHEN '6' THEN 'Purple'
                        WHEN '7' THEN 'Orange'
                        WHEN '8' THEN 'Pink'
                        WHEN '9' THEN 'Gray'
                        WHEN '10' THEN 'Navy'
                        ELSE 'Black'
                    END
            ");

            migrationBuilder.AlterColumn<string>(
                name: "Color",
                table: "ProductVariants",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<Guid>(
                name: "ImageId",
                table: "ProductVariants",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ImageId",
                table: "ProductVariants",
                column: "ImageId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductVariants_Assets_ImageId",
                table: "ProductVariants",
                column: "ImageId",
                principalTable: "Assets",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductVariants_Assets_ImageId",
                table: "ProductVariants");

            migrationBuilder.DropIndex(
                name: "IX_ProductVariants_ImageId",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "ImageId",
                table: "ProductVariants");

            migrationBuilder.AlterColumn<int>(
                name: "Color",
                table: "ProductVariants",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 50);
        }
    }
}

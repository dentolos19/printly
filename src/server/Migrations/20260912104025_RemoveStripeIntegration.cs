using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintlyServer.Migrations
{
    /// <inheritdoc />
    public partial class RemoveStripeIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Refunds_StripeRefundId",
                table: "Refunds");

            migrationBuilder.DropIndex(
                name: "IX_Payments_StripeCheckoutSessionId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "StripeRefundId",
                table: "Refunds");

            migrationBuilder.DropColumn(
                name: "StripeCheckoutSessionId",
                table: "Payments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StripeRefundId",
                table: "Refunds",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeCheckoutSessionId",
                table: "Payments",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Refunds_StripeRefundId",
                table: "Refunds",
                column: "StripeRefundId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_StripeCheckoutSessionId",
                table: "Payments",
                column: "StripeCheckoutSessionId",
                unique: true);
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintlyServer.Migrations
{
    /// <inheritdoc />
    public partial class AddFileFieldsToTicketMessage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "TicketMessages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "TicketMessages",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileType",
                table: "TicketMessages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileUrl",
                table: "TicketMessages",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FileName",
                table: "TicketMessages");

            migrationBuilder.DropColumn(
                name: "FileSize",
                table: "TicketMessages");

            migrationBuilder.DropColumn(
                name: "FileType",
                table: "TicketMessages");

            migrationBuilder.DropColumn(
                name: "FileUrl",
                table: "TicketMessages");
        }
    }
}

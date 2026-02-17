using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintlyServer.Migrations
{
    /// <inheritdoc />
    public partial class AddCallRecordingAndNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AiCallNotes",
                table: "CallLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RecordingAssetId",
                table: "CallLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Transcript",
                table: "CallLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CallLogs_RecordingAssetId",
                table: "CallLogs",
                column: "RecordingAssetId");

            migrationBuilder.AddForeignKey(
                name: "FK_CallLogs_Assets_RecordingAssetId",
                table: "CallLogs",
                column: "RecordingAssetId",
                principalTable: "Assets",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CallLogs_Assets_RecordingAssetId",
                table: "CallLogs");

            migrationBuilder.DropIndex(
                name: "IX_CallLogs_RecordingAssetId",
                table: "CallLogs");

            migrationBuilder.DropColumn(
                name: "AiCallNotes",
                table: "CallLogs");

            migrationBuilder.DropColumn(
                name: "RecordingAssetId",
                table: "CallLogs");

            migrationBuilder.DropColumn(
                name: "Transcript",
                table: "CallLogs");
        }
    }
}

BEGIN TRANSACTION;
ALTER TABLE "ConversationMessages" ADD "CallLogId" TEXT NULL;

ALTER TABLE "ConversationMessages" ADD "IsCallMessage" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CallLogs" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_CallLogs" PRIMARY KEY,
    "ConversationId" TEXT NOT NULL,
    "InitiatorId" TEXT NOT NULL,
    "Type" INTEGER NOT NULL,
    "Status" INTEGER NOT NULL,
    "StartedAt" TEXT NOT NULL,
    "EndedAt" TEXT NULL,
    "DurationSeconds" INTEGER NULL,
    "LiveKitRoomName" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_CallLogs_AspNetUsers_InitiatorId" FOREIGN KEY ("InitiatorId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_CallLogs_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE
);

CREATE TABLE "CallParticipants" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_CallParticipants" PRIMARY KEY,
    "CallLogId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "JoinedAt" TEXT NULL,
    "LeftAt" TEXT NULL,
    "DidAnswer" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_CallParticipants_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_CallParticipants_CallLogs_CallLogId" FOREIGN KEY ("CallLogId") REFERENCES "CallLogs" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_ConversationMessages_CallLogId" ON "ConversationMessages" ("CallLogId");

CREATE INDEX "IX_CallLogs_ConversationId" ON "CallLogs" ("ConversationId");

CREATE INDEX "IX_CallLogs_InitiatorId" ON "CallLogs" ("InitiatorId");

CREATE INDEX "IX_CallParticipants_CallLogId" ON "CallParticipants" ("CallLogId");

CREATE INDEX "IX_CallParticipants_UserId" ON "CallParticipants" ("UserId");

CREATE TABLE "ef_temp_RefreshTokens" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_RefreshTokens" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "ExpiresAt" TEXT NOT NULL,
    "ReplacedByToken" TEXT NULL,
    "RevokedAt" TEXT NULL,
    "Token" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_RefreshTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_RefreshTokens" ("Id", "CreatedAt", "ExpiresAt", "ReplacedByToken", "RevokedAt", "Token", "UpdatedAt", "UserId")
SELECT "Id", "CreatedAt", "ExpiresAt", "ReplacedByToken", "RevokedAt", "Token", "UpdatedAt", "UserId"
FROM "RefreshTokens";

CREATE TABLE "ef_temp_ProductVariants" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ProductVariants" PRIMARY KEY,
    "Color" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "ImageId" TEXT NULL,
    "ProductId" TEXT NOT NULL,
    "Size" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_ProductVariants_Assets_ImageId" FOREIGN KEY ("ImageId") REFERENCES "Assets" ("Id"),
    CONSTRAINT "FK_ProductVariants_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_ProductVariants" ("Id", "Color", "CreatedAt", "ImageId", "ProductId", "Size", "UpdatedAt")
SELECT "Id", "Color", "CreatedAt", "ImageId", "ProductId", "Size", "UpdatedAt"
FROM "ProductVariants";

CREATE TABLE "ef_temp_Products" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Products" PRIMARY KEY,
    "BasePrice" decimal(10,2) NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "IsActive" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL
);

INSERT INTO "ef_temp_Products" ("Id", "BasePrice", "CreatedAt", "IsActive", "Name", "UpdatedAt")
SELECT "Id", "BasePrice", "CreatedAt", "IsActive", "Name", "UpdatedAt"
FROM "Products";

CREATE TABLE "ef_temp_Posts" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Posts" PRIMARY KEY,
    "AuthorId" TEXT NOT NULL,
    "Caption" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "PhotoId" TEXT NOT NULL,
    "PostStatus" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "Visibility" INTEGER NOT NULL,
    CONSTRAINT "FK_Posts_AspNetUsers_AuthorId" FOREIGN KEY ("AuthorId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Posts_Assets_PhotoId" FOREIGN KEY ("PhotoId") REFERENCES "Assets" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Posts" ("Id", "AuthorId", "Caption", "CreatedAt", "PhotoId", "PostStatus", "UpdatedAt", "Visibility")
SELECT "Id", "AuthorId", "Caption", "CreatedAt", "PhotoId", "PostStatus", "UpdatedAt", "Visibility"
FROM "Posts";

CREATE TABLE "ef_temp_PostReactions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_PostReactions" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "PostId" TEXT NOT NULL,
    "ReactionType" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_PostReactions_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_PostReactions_Posts_PostId" FOREIGN KEY ("PostId") REFERENCES "Posts" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_PostReactions" ("Id", "CreatedAt", "PostId", "ReactionType", "UpdatedAt", "UserId")
SELECT "Id", "CreatedAt", "PostId", "ReactionType", "UpdatedAt", "UserId"
FROM "PostReactions";

CREATE TABLE "ef_temp_PostComments" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_PostComments" PRIMARY KEY,
    "AuthorId" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "ParentId" TEXT NULL,
    "PostId" TEXT NOT NULL,
    "PostStatus" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_PostComments_AspNetUsers_AuthorId" FOREIGN KEY ("AuthorId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_PostComments_PostComments_ParentId" FOREIGN KEY ("ParentId") REFERENCES "PostComments" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_PostComments_Posts_PostId" FOREIGN KEY ("PostId") REFERENCES "Posts" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_PostComments" ("Id", "AuthorId", "Content", "CreatedAt", "ParentId", "PostId", "PostStatus", "UpdatedAt")
SELECT "Id", "AuthorId", "Content", "CreatedAt", "ParentId", "PostId", "PostStatus", "UpdatedAt"
FROM "PostComments";

CREATE TABLE "ef_temp_PostBookmarks" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_PostBookmarks" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "PostId" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_PostBookmarks_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_PostBookmarks_Posts_PostId" FOREIGN KEY ("PostId") REFERENCES "Posts" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_PostBookmarks" ("Id", "CreatedAt", "PostId", "UpdatedAt", "UserId")
SELECT "Id", "CreatedAt", "PostId", "UpdatedAt", "UserId"
FROM "PostBookmarks";

CREATE TABLE "ef_temp_Orders" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Orders" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "Status" INTEGER NOT NULL,
    "TotalAmount" decimal(10,2) NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Orders_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

INSERT INTO "ef_temp_Orders" ("Id", "CreatedAt", "Status", "TotalAmount", "UpdatedAt", "UserId")
SELECT "Id", "CreatedAt", "Status", "TotalAmount", "UpdatedAt", "UserId"
FROM "Orders";

CREATE TABLE "ef_temp_OrderItems" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_OrderItems" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "OrderId" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "RequestId" TEXT NULL,
    "Subtotal" decimal(10,2) NOT NULL,
    "UnitPrice" decimal(10,2) NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "VariantId" TEXT NOT NULL,
    CONSTRAINT "FK_OrderItems_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_OrderItems_ProductVariants_VariantId" FOREIGN KEY ("VariantId") REFERENCES "ProductVariants" ("Id") ON DELETE RESTRICT
);

INSERT INTO "ef_temp_OrderItems" ("Id", "CreatedAt", "OrderId", "Quantity", "RequestId", "Subtotal", "UnitPrice", "UpdatedAt", "VariantId")
SELECT "Id", "CreatedAt", "OrderId", "Quantity", "RequestId", "Subtotal", "UnitPrice", "UpdatedAt", "VariantId"
FROM "OrderItems";

CREATE TABLE "ef_temp_Notifications" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Notifications" PRIMARY KEY,
    "ActionUrl" TEXT NULL,
    "ArchivedAt" TEXT NULL,
    "ConversationId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "DeletedAt" TEXT NULL,
    "IsArchived" INTEGER NOT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "IsRead" INTEGER NOT NULL,
    "Message" TEXT NOT NULL,
    "MessageId" TEXT NULL,
    "Priority" INTEGER NOT NULL,
    "ReadAt" TEXT NULL,
    "Title" TEXT NOT NULL,
    "Type" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Notifications_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Notifications_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE SET NULL
);

INSERT INTO "ef_temp_Notifications" ("Id", "ActionUrl", "ArchivedAt", "ConversationId", "CreatedAt", "DeletedAt", "IsArchived", "IsDeleted", "IsRead", "Message", "MessageId", "Priority", "ReadAt", "Title", "Type", "UpdatedAt", "UserId")
SELECT "Id", "ActionUrl", "ArchivedAt", "ConversationId", "CreatedAt", "DeletedAt", "IsArchived", "IsDeleted", "IsRead", "Message", "MessageId", "Priority", "ReadAt", "Title", "Type", "UpdatedAt", "UserId"
FROM "Notifications";

CREATE TABLE "ef_temp_Inventories" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Inventories" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "ReorderLevel" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "VariantId" TEXT NOT NULL,
    CONSTRAINT "FK_Inventories_ProductVariants_VariantId" FOREIGN KEY ("VariantId") REFERENCES "ProductVariants" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Inventories" ("Id", "CreatedAt", "Quantity", "ReorderLevel", "UpdatedAt", "VariantId")
SELECT "Id", "CreatedAt", "Quantity", "ReorderLevel", "UpdatedAt", "VariantId"
FROM "Inventories";

CREATE TABLE "ef_temp_Imprints" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Imprints" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "Data" jsonb NOT NULL,
    "Description" TEXT NULL,
    "Name" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Imprints_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Imprints" ("Id", "CreatedAt", "Data", "Description", "Name", "UpdatedAt", "UserId")
SELECT "Id", "CreatedAt", "Data", "Description", "Name", "UpdatedAt", "UserId"
FROM "Imprints";

CREATE TABLE "ef_temp_Designs" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Designs" PRIMARY KEY,
    "CoverId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "Data" jsonb NOT NULL,
    "Description" TEXT NULL,
    "Name" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Designs_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Designs_Assets_CoverId" FOREIGN KEY ("CoverId") REFERENCES "Assets" ("Id")
);

INSERT INTO "ef_temp_Designs" ("Id", "CoverId", "CreatedAt", "Data", "Description", "Name", "UpdatedAt", "UserId")
SELECT "Id", "CoverId", "CreatedAt", "Data", "Description", "Name", "UpdatedAt", "UserId"
FROM "Designs";

CREATE TABLE "ef_temp_Conversations" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Conversations" PRIMARY KEY,
    "AssignedToAdminId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "CustomerId" TEXT NOT NULL,
    "LastMessageAt" TEXT NULL,
    "OrderId" TEXT NULL,
    "Priority" INTEGER NOT NULL,
    "Status" INTEGER NOT NULL,
    "Subject" TEXT NULL,
    "SupportMode" INTEGER NOT NULL,
    "UnreadCount" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Conversations_AspNetUsers_AssignedToAdminId" FOREIGN KEY ("AssignedToAdminId") REFERENCES "AspNetUsers" ("Id"),
    CONSTRAINT "FK_Conversations_AspNetUsers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Conversations" ("Id", "AssignedToAdminId", "CreatedAt", "CustomerId", "LastMessageAt", "OrderId", "Priority", "Status", "Subject", "SupportMode", "UnreadCount", "UpdatedAt")
SELECT "Id", "AssignedToAdminId", "CreatedAt", "CustomerId", "LastMessageAt", "OrderId", "Priority", "Status", "Subject", "SupportMode", "UnreadCount", "UpdatedAt"
FROM "Conversations";

CREATE TABLE "ef_temp_ConversationParticipants" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ConversationParticipants" PRIMARY KEY,
    "ConversationId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "Role" INTEGER NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_ConversationParticipants_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_ConversationParticipants_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_ConversationParticipants" ("Id", "ConversationId", "CreatedAt", "Role", "UpdatedAt", "UserId")
SELECT "Id", "ConversationId", "CreatedAt", "Role", "UpdatedAt", "UserId"
FROM "ConversationParticipants";

CREATE TABLE "ef_temp_ConversationMessages" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ConversationMessages" PRIMARY KEY,
    "AssetId" TEXT NULL,
    "CallLogId" TEXT NULL,
    "Content" TEXT NOT NULL,
    "ConversationId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "DeletedAt" TEXT NULL,
    "EditedAt" TEXT NULL,
    "FileName" TEXT NULL,
    "FileSize" INTEGER NULL,
    "FileType" TEXT NULL,
    "FileUrl" TEXT NULL,
    "IsCallMessage" INTEGER NOT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "IsEdited" INTEGER NOT NULL,
    "IsRead" INTEGER NOT NULL,
    "ParticipantId" TEXT NOT NULL,
    "ReadAt" TEXT NULL,
    "ReplyToMessageId" TEXT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "VoiceMessageDuration" INTEGER NULL,
    "VoiceMessageUrl" TEXT NULL,
    CONSTRAINT "FK_ConversationMessages_CallLogs_CallLogId" FOREIGN KEY ("CallLogId") REFERENCES "CallLogs" ("Id"),
    CONSTRAINT "FK_ConversationMessages_ConversationMessages_ReplyToMessageId" FOREIGN KEY ("ReplyToMessageId") REFERENCES "ConversationMessages" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_ConversationMessages_ConversationParticipants_ParticipantId" FOREIGN KEY ("ParticipantId") REFERENCES "ConversationParticipants" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_ConversationMessages_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_ConversationMessages" ("Id", "AssetId", "CallLogId", "Content", "ConversationId", "CreatedAt", "DeletedAt", "EditedAt", "FileName", "FileSize", "FileType", "FileUrl", "IsCallMessage", "IsDeleted", "IsEdited", "IsRead", "ParticipantId", "ReadAt", "ReplyToMessageId", "UpdatedAt", "VoiceMessageDuration", "VoiceMessageUrl")
SELECT "Id", "AssetId", "CallLogId", "Content", "ConversationId", "CreatedAt", "DeletedAt", "EditedAt", "FileName", "FileSize", "FileType", "FileUrl", "IsCallMessage", "IsDeleted", "IsEdited", "IsRead", "ParticipantId", "ReadAt", "ReplyToMessageId", "UpdatedAt", "VoiceMessageDuration", "VoiceMessageUrl"
FROM "ConversationMessages";

CREATE TABLE "ef_temp_ChatbotMessages" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ChatbotMessages" PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "Model" TEXT NULL,
    "Role" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL
);

INSERT INTO "ef_temp_ChatbotMessages" ("Id", "Content", "CreatedAt", "Model", "Role", "UpdatedAt", "UserId")
SELECT "Id", "Content", "CreatedAt", "Model", "Role", "UpdatedAt", "UserId"
FROM "ChatbotMessages";

CREATE TABLE "ef_temp_Broadcasts" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Broadcasts" PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "ExpiresAt" TEXT NULL,
    "IsActive" INTEGER NOT NULL,
    "SenderId" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Broadcasts_AspNetUsers_SenderId" FOREIGN KEY ("SenderId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

INSERT INTO "ef_temp_Broadcasts" ("Id", "Content", "CreatedAt", "ExpiresAt", "IsActive", "SenderId", "Title", "UpdatedAt")
SELECT "Id", "Content", "CreatedAt", "ExpiresAt", "IsActive", "SenderId", "Title", "UpdatedAt"
FROM "Broadcasts";

CREATE TABLE "ef_temp_Assets" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Assets" PRIMARY KEY,
    "Category" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "Description" TEXT NULL,
    "Hash" TEXT NOT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "IsGenerated" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Size" INTEGER NOT NULL,
    "Type" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserId" TEXT NULL,
    CONSTRAINT "FK_Assets_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id")
);

INSERT INTO "ef_temp_Assets" ("Id", "Category", "CreatedAt", "Description", "Hash", "IsDeleted", "IsGenerated", "Name", "Size", "Type", "UpdatedAt", "UserId")
SELECT "Id", "Category", "CreatedAt", "Description", "Hash", "IsDeleted", "IsGenerated", "Name", "Size", "Type", "UpdatedAt", "UserId"
FROM "Assets";

CREATE TABLE "ef_temp_AspNetUserTokens" (
    "UserId" TEXT NOT NULL,
    "LoginProvider" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Value" TEXT NULL,
    CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_AspNetUserTokens" ("UserId", "LoginProvider", "Name", "Value")
SELECT "UserId", "LoginProvider", "Name", "Value"
FROM "AspNetUserTokens";

CREATE TABLE "ef_temp_AspNetUsers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetUsers" PRIMARY KEY,
    "AccessFailedCount" INTEGER NOT NULL,
    "ConcurrencyStamp" TEXT NULL,
    "Email" TEXT NULL,
    "EmailConfirmed" INTEGER NOT NULL,
    "LockoutEnabled" INTEGER NOT NULL,
    "LockoutEnd" TEXT NULL,
    "NormalizedEmail" TEXT NULL,
    "NormalizedUserName" TEXT NULL,
    "PasswordHash" TEXT NULL,
    "PhoneNumber" TEXT NULL,
    "PhoneNumberConfirmed" INTEGER NOT NULL,
    "Role" TEXT NOT NULL,
    "SecurityStamp" TEXT NULL,
    "TwoFactorEnabled" INTEGER NOT NULL,
    "UserName" TEXT NULL
);

INSERT INTO "ef_temp_AspNetUsers" ("Id", "AccessFailedCount", "ConcurrencyStamp", "Email", "EmailConfirmed", "LockoutEnabled", "LockoutEnd", "NormalizedEmail", "NormalizedUserName", "PasswordHash", "PhoneNumber", "PhoneNumberConfirmed", "Role", "SecurityStamp", "TwoFactorEnabled", "UserName")
SELECT "Id", "AccessFailedCount", "ConcurrencyStamp", "Email", "EmailConfirmed", "LockoutEnabled", "LockoutEnd", "NormalizedEmail", "NormalizedUserName", "PasswordHash", "PhoneNumber", "PhoneNumberConfirmed", "Role", "SecurityStamp", "TwoFactorEnabled", "UserName"
FROM "AspNetUsers";

CREATE TABLE "ef_temp_AspNetUserRoles" (
    "UserId" TEXT NOT NULL,
    "RoleId" TEXT NOT NULL,
    CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_AspNetUserRoles" ("UserId", "RoleId")
SELECT "UserId", "RoleId"
FROM "AspNetUserRoles";

CREATE TABLE "ef_temp_AspNetUserLogins" (
    "LoginProvider" TEXT NOT NULL,
    "ProviderKey" TEXT NOT NULL,
    "ProviderDisplayName" TEXT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
    CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_AspNetUserLogins" ("LoginProvider", "ProviderKey", "ProviderDisplayName", "UserId")
SELECT "LoginProvider", "ProviderKey", "ProviderDisplayName", "UserId"
FROM "AspNetUserLogins";

CREATE TABLE "ef_temp_AspNetUserClaims" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY AUTOINCREMENT,
    "ClaimType" TEXT NULL,
    "ClaimValue" TEXT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_AspNetUserClaims" ("Id", "ClaimType", "ClaimValue", "UserId")
SELECT "Id", "ClaimType", "ClaimValue", "UserId"
FROM "AspNetUserClaims";

CREATE TABLE "ef_temp_AspNetRoles" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetRoles" PRIMARY KEY,
    "ConcurrencyStamp" TEXT NULL,
    "Name" TEXT NULL,
    "NormalizedName" TEXT NULL
);

INSERT INTO "ef_temp_AspNetRoles" ("Id", "ConcurrencyStamp", "Name", "NormalizedName")
SELECT "Id", "ConcurrencyStamp", "Name", "NormalizedName"
FROM "AspNetRoles";

CREATE TABLE "ef_temp_AspNetRoleClaims" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY AUTOINCREMENT,
    "ClaimType" TEXT NULL,
    "ClaimValue" TEXT NULL,
    "RoleId" TEXT NOT NULL,
    CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_AspNetRoleClaims" ("Id", "ClaimType", "ClaimValue", "RoleId")
SELECT "Id", "ClaimType", "ClaimValue", "RoleId"
FROM "AspNetRoleClaims";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "RefreshTokens";

ALTER TABLE "ef_temp_RefreshTokens" RENAME TO "RefreshTokens";

DROP TABLE "ProductVariants";

ALTER TABLE "ef_temp_ProductVariants" RENAME TO "ProductVariants";

DROP TABLE "Products";

ALTER TABLE "ef_temp_Products" RENAME TO "Products";

DROP TABLE "Posts";

ALTER TABLE "ef_temp_Posts" RENAME TO "Posts";

DROP TABLE "PostReactions";

ALTER TABLE "ef_temp_PostReactions" RENAME TO "PostReactions";

DROP TABLE "PostComments";

ALTER TABLE "ef_temp_PostComments" RENAME TO "PostComments";

DROP TABLE "PostBookmarks";

ALTER TABLE "ef_temp_PostBookmarks" RENAME TO "PostBookmarks";

DROP TABLE "Orders";

ALTER TABLE "ef_temp_Orders" RENAME TO "Orders";

DROP TABLE "OrderItems";

ALTER TABLE "ef_temp_OrderItems" RENAME TO "OrderItems";

DROP TABLE "Notifications";

ALTER TABLE "ef_temp_Notifications" RENAME TO "Notifications";

DROP TABLE "Inventories";

ALTER TABLE "ef_temp_Inventories" RENAME TO "Inventories";

DROP TABLE "Imprints";

ALTER TABLE "ef_temp_Imprints" RENAME TO "Imprints";

DROP TABLE "Designs";

ALTER TABLE "ef_temp_Designs" RENAME TO "Designs";

DROP TABLE "Conversations";

ALTER TABLE "ef_temp_Conversations" RENAME TO "Conversations";

DROP TABLE "ConversationParticipants";

ALTER TABLE "ef_temp_ConversationParticipants" RENAME TO "ConversationParticipants";

DROP TABLE "ConversationMessages";

ALTER TABLE "ef_temp_ConversationMessages" RENAME TO "ConversationMessages";

DROP TABLE "ChatbotMessages";

ALTER TABLE "ef_temp_ChatbotMessages" RENAME TO "ChatbotMessages";

DROP TABLE "Broadcasts";

ALTER TABLE "ef_temp_Broadcasts" RENAME TO "Broadcasts";

DROP TABLE "Assets";

ALTER TABLE "ef_temp_Assets" RENAME TO "Assets";

DROP TABLE "AspNetUserTokens";

ALTER TABLE "ef_temp_AspNetUserTokens" RENAME TO "AspNetUserTokens";

DROP TABLE "AspNetUsers";

ALTER TABLE "ef_temp_AspNetUsers" RENAME TO "AspNetUsers";

DROP TABLE "AspNetUserRoles";

ALTER TABLE "ef_temp_AspNetUserRoles" RENAME TO "AspNetUserRoles";

DROP TABLE "AspNetUserLogins";

ALTER TABLE "ef_temp_AspNetUserLogins" RENAME TO "AspNetUserLogins";

DROP TABLE "AspNetUserClaims";

ALTER TABLE "ef_temp_AspNetUserClaims" RENAME TO "AspNetUserClaims";

DROP TABLE "AspNetRoles";

ALTER TABLE "ef_temp_AspNetRoles" RENAME TO "AspNetRoles";

DROP TABLE "AspNetRoleClaims";

ALTER TABLE "ef_temp_AspNetRoleClaims" RENAME TO "AspNetRoleClaims";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_RefreshTokens_UserId" ON "RefreshTokens" ("UserId");

CREATE INDEX "IX_ProductVariants_ImageId" ON "ProductVariants" ("ImageId");

CREATE UNIQUE INDEX "IX_ProductVariants_ProductId_Size_Color" ON "ProductVariants" ("ProductId", "Size", "Color");

CREATE INDEX "IX_Products_IsActive" ON "Products" ("IsActive");

CREATE INDEX "IX_Posts_AuthorId" ON "Posts" ("AuthorId");

CREATE INDEX "IX_Posts_CreatedAt" ON "Posts" ("CreatedAt");

CREATE INDEX "IX_Posts_PhotoId" ON "Posts" ("PhotoId");

CREATE INDEX "IX_Posts_PostStatus" ON "Posts" ("PostStatus");

CREATE INDEX "IX_Posts_Visibility" ON "Posts" ("Visibility");

CREATE UNIQUE INDEX "IX_PostReactions_PostId_UserId" ON "PostReactions" ("PostId", "UserId");

CREATE INDEX "IX_PostReactions_UserId" ON "PostReactions" ("UserId");

CREATE INDEX "IX_PostComments_AuthorId" ON "PostComments" ("AuthorId");

CREATE INDEX "IX_PostComments_ParentId" ON "PostComments" ("ParentId");

CREATE INDEX "IX_PostComments_PostId" ON "PostComments" ("PostId");

CREATE UNIQUE INDEX "IX_PostBookmarks_PostId_UserId" ON "PostBookmarks" ("PostId", "UserId");

CREATE INDEX "IX_PostBookmarks_UserId" ON "PostBookmarks" ("UserId");

CREATE INDEX "IX_Orders_CreatedAt" ON "Orders" ("CreatedAt");

CREATE INDEX "IX_Orders_Status" ON "Orders" ("Status");

CREATE INDEX "IX_Orders_UserId" ON "Orders" ("UserId");

CREATE INDEX "IX_OrderItems_OrderId" ON "OrderItems" ("OrderId");

CREATE INDEX "IX_OrderItems_VariantId" ON "OrderItems" ("VariantId");

CREATE INDEX "IX_Notifications_ConversationId" ON "Notifications" ("ConversationId");

CREATE INDEX "IX_Notifications_CreatedAt" ON "Notifications" ("CreatedAt");

CREATE INDEX "IX_Notifications_UserId_IsRead_IsDeleted" ON "Notifications" ("UserId", "IsRead", "IsDeleted");

CREATE UNIQUE INDEX "IX_Inventories_VariantId" ON "Inventories" ("VariantId");

CREATE INDEX "IX_Imprints_UserId" ON "Imprints" ("UserId");

CREATE INDEX "IX_Designs_CoverId" ON "Designs" ("CoverId");

CREATE INDEX "IX_Designs_UserId" ON "Designs" ("UserId");

CREATE INDEX "IX_Conversations_AssignedToAdminId" ON "Conversations" ("AssignedToAdminId");

CREATE INDEX "IX_Conversations_CustomerId" ON "Conversations" ("CustomerId");

CREATE UNIQUE INDEX "IX_ConversationParticipants_ConversationId_UserId" ON "ConversationParticipants" ("ConversationId", "UserId");

CREATE INDEX "IX_ConversationParticipants_UserId" ON "ConversationParticipants" ("UserId");

CREATE INDEX "IX_ConversationMessages_CallLogId" ON "ConversationMessages" ("CallLogId");

CREATE INDEX "IX_ConversationMessages_ConversationId" ON "ConversationMessages" ("ConversationId");

CREATE INDEX "IX_ConversationMessages_CreatedAt" ON "ConversationMessages" ("CreatedAt");

CREATE INDEX "IX_ConversationMessages_ParticipantId" ON "ConversationMessages" ("ParticipantId");

CREATE INDEX "IX_ConversationMessages_ReplyToMessageId" ON "ConversationMessages" ("ReplyToMessageId");

CREATE INDEX "IX_Broadcasts_SenderId" ON "Broadcasts" ("SenderId");

CREATE INDEX "IX_Assets_UserId" ON "Assets" ("UserId");

CREATE INDEX "EmailIndex" ON "AspNetUsers" ("NormalizedEmail");

CREATE UNIQUE INDEX "UserNameIndex" ON "AspNetUsers" ("NormalizedUserName");

CREATE INDEX "IX_AspNetUserRoles_RoleId" ON "AspNetUserRoles" ("RoleId");

CREATE INDEX "IX_AspNetUserLogins_UserId" ON "AspNetUserLogins" ("UserId");

CREATE INDEX "IX_AspNetUserClaims_UserId" ON "AspNetUserClaims" ("UserId");

CREATE UNIQUE INDEX "RoleNameIndex" ON "AspNetRoles" ("NormalizedName");

CREATE INDEX "IX_AspNetRoleClaims_RoleId" ON "AspNetRoleClaims" ("RoleId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260128055202_AddCallingFeature', '10.0.0');


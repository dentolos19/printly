using System.Security.Claims;

namespace MocklyServer.Auth;

/// <summary>
/// A collection of C# <see cref="Claim"/> strings that
/// </summary>
public static class Claims
{
    /// <summary>Allows the user with this claim to edit/delete other users' data</summary>
    public const string ManageUsers = "users.manage";

    /// <summary>Allows the user to edit/delete their personal profile </summary>
    public const string EditProfile = "profiles.edit";

    /// <summary>Allows the user to change the role of other users</summary>
    public const string ManageRoles = "roles.manage";
}
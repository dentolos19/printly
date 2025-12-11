using System.Security.Claims;

namespace PrintlyServer.Data.Auth;

/// <summary>
/// A helper class that exposes constants for each role, along with methods for getting each role's <see cref="Claims"/>
/// </summary>
public static class Roles
{
   public const string Admin = "Admin";
   public const string User = "User";

   private static readonly Dictionary<string, List<Claim>> RoleClaims = new Dictionary<string, List<Claim>>
   {
      [Admin] =
      [
         new Claim(ClaimTypes.Role, Admin),
         new Claim("permission", Claims.ManageRoles),
         new Claim("permission", Claims.ManageUsers),
         new Claim("permission", Claims.EditProfile),
      ],

      [User] =
      [
         new Claim(ClaimTypes.Role, User),
         new Claim("permission", Claims.EditProfile),
      ]
   };

   public static IEnumerable<string> GetRoles() => RoleClaims.Keys;

   /// <summary>
   /// Gives all the claims associated with a specified user type
   /// </summary>
   /// <param name="role">The targeted role's name</param>
   /// <returns>All the claims that belong to that user type, or an empty list if not found</returns>
   public static List<Claim> GetClaimsForRole(string role) => RoleClaims.TryGetValue(role, out var claims) ? claims : [];
}
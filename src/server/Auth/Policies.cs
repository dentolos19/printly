namespace EnterpriseServer.Auth;

public static class Policies
{
    public const string AdminOnly = "AdminOnly";
    public const string LoggedIn = "AllUsers";
    public const string CanManageUsers = "CanManageUsers";
    public const string CanManageRoles = "CanManageRoles";
    public const string CanEditProfile = "CanEditProfile";
}
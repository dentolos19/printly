using Microsoft.AspNetCore.Identity;

namespace MocklyServer.Models;

public class User : IdentityUser
{
    //potential attributes outside the ones listed below can be implemented later
    //UserName
    //Email
    //PasswordHash
    //PhoneNumber
    //SecurityStamp (defined as "a random value that must change whenever a users credentials change)
    //ConcurrencyStamp

    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
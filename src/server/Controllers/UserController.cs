using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;

namespace PrintlyServer.Controllers;

[Route("user")]
[Authorize(Policy = Policies.LoggedIn)]
public class UserController(DatabaseContext database, UserManager<User> userManager) : BaseController(database)
{
    [HttpGet]
    [Route("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized();

        var user = await Context
            .Users.Include(u => u.Followers)
            .Include(u => u.Following)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        return Ok(
            new UserProfileResponse(
                user.Id,
                user.Email!,
                user.DisplayName,
                user.Bio,
                user.AvatarId,
                user.Location,
                user.Website,
                user.DateOfBirth,
                user.Role,
                user.PasswordHash != null,
                user.Followers.Count,
                user.Following.Count,
                user.CreatedAt,
                user.UpdatedAt
            )
        );
    }

    [HttpPut]
    [Route("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized();

        var user = await Context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        user.DisplayName = dto.DisplayName ?? user.DisplayName;
        user.Bio = dto.Bio ?? user.Bio;
        user.AvatarId = dto.AvatarId ?? user.AvatarId;
        user.Location = dto.Location ?? user.Location;
        user.Website = dto.Website ?? user.Website;
        user.DateOfBirth = dto.DateOfBirth ?? user.DateOfBirth;
        user.UpdatedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        return Ok(
            new UserProfileResponse(
                user.Id,
                user.Email!,
                user.DisplayName,
                user.Bio,
                user.AvatarId,
                user.Location,
                user.Website,
                user.DateOfBirth,
                user.Role,
                user.PasswordHash != null,
                0,
                0,
                user.CreatedAt,
                user.UpdatedAt
            )
        );
    }

    [HttpPut]
    [Route("email")]
    public async Task<IActionResult> UpdateEmail([FromBody] UpdateEmailDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        var passwordValid = await userManager.CheckPasswordAsync(user, dto.Password);
        if (!passwordValid)
            return BadRequest("Invalid password");

        var existingUser = await userManager.FindByEmailAsync(dto.NewEmail);
        if (existingUser != null)
            return BadRequest("Email already in use");

        user.Email = dto.NewEmail;
        user.UserName = dto.NewEmail;
        user.NormalizedEmail = dto.NewEmail.ToUpperInvariant();
        user.NormalizedUserName = dto.NewEmail.ToUpperInvariant();
        user.UpdatedAt = DateTime.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.First().Description);

        return Ok();
    }

    [HttpPut]
    [Route("password")]
    public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        var result = await userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(result.Errors.First().Description);

        return Ok();
    }

    [HttpGet]
    [Route("{userId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicProfile(string userId)
    {
        var user = await Context
            .Users.Include(u => u.Followers)
            .Include(u => u.Following)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        var currentUserId = User.GetUserId();
        var isFollowing =
            currentUserId != null
            && await Context.UserFollowers.AnyAsync(f => f.FollowerId == currentUserId && f.FollowingId == userId);

        return Ok(
            new PublicUserProfileResponse(
                user.Id,
                user.DisplayName,
                user.Bio,
                user.AvatarId,
                user.Location,
                user.Website,
                user.Followers.Count,
                user.Following.Count,
                isFollowing,
                user.CreatedAt
            )
        );
    }

    [HttpDelete]
    [Route("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.First().Description);

        return Ok();
    }
}

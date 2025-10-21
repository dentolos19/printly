using System.Security.Claims;
using EnterpriseServer;
using EnterpriseServer.Auth;
using EnterpriseServer.Models;
using EnterpriseServer.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
builder.Services.AddAuthorization();
builder.Services.AddAuthPolicies();
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=data.db"));
builder.Services.AddIdentityApiEndpoints<User>().AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDbContext>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();
app.MapIdentityApi<User>();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    //temporary so that i can run operations without creating migrations
    db.Database.EnsureCreated();

    foreach (string name in Roles.GetRoles())
    {
        if (!await roleManager.RoleExistsAsync(name))
        {
            var role = new IdentityRole(name);
            var createResult = await roleManager.CreateAsync(role);

            if (createResult.Succeeded)
            {
                List<Claim> claims = Roles.GetClaimsForRole(name);
                foreach (Claim claim in claims.Where(c => c.Type != ClaimTypes.Role))
                {
                    await roleManager.AddClaimAsync(role, claim);
                }
            }
        }
    }
}

app.MapControllers();

app.Run();
using System.Security.Claims;
using EnterpriseServer;
using EnterpriseServer.Auth;
using EnterpriseServer.Models;
using EnterpriseServer.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
builder.Services.AddAuthorization();
builder.Services.AddAuthPolicies();
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=data.db"));
builder.Services.AddIdentityApiEndpoints<User>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapIdentityApi<User>();

app.MapGet("/", () =>
{
    return "Welcome to Enterprise API!";
}).WithName("GetRoot");

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.RequireAuthorization();

//temporary so that i can run operations without creating migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    db.Database.EnsureCreated();

    foreach (string name in Roles.GetRoles())
    {
        if (!await roleManager.RoleExistsAsync(name))
        {
            var role = new IdentityRole(name);
            await roleManager.CreateAsync(new IdentityRole(name));

            List<Claim> claims = Roles.GetClaimsForRole(name);
            foreach (Claim claim in claims.Where(c => c.Type != ClaimTypes.Role))
            {
                await roleManager.AddClaimAsync(role, claim);
            }
        }
    }
}

app.MapGet("/environment", () =>
{
    var variables = Environment.GetEnvironmentVariables()
        .Cast<System.Collections.DictionaryEntry>()
        .ToDictionary(x => x.Key.ToString(), x => x.Value?.ToString());
    return variables;
})
.WithName("GetEnvironmentVariables");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
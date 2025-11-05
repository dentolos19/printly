using DotNetEnv.Configuration;
using Microsoft.EntityFrameworkCore;
using MocklyServer;
using MocklyServer.Extensions;
using MocklyServer.Models;
using MocklyServer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddDotNetEnv();

builder.Services.SetupCors();
builder.Services.SetupAuth();
builder.Services.SetupDatabase();
builder.Services.SetupRouting();
builder.Services.SetupDocumentation();

builder.Services.AddSingleton<StorageService>();
builder.Services.AddSingleton<GeminiService>();

var app = builder.Build();

app.SetupMiddlewares();
app.SetupCors();
app.SetupAuth();
app.SetupDocumentation();

app.MapIdentityApi<User>();
await app.SetupRolesAsync();
app.MapControllers();

if (app.Environment.IsProduction())
{
    // Redirect HTTP requests to HTTPS in production
    app.UseHttpsRedirection();
}
else
{
    // Use the developer exception page for detailed error information during development
    app.UseDeveloperExceptionPage();

    // Ensure database is created and migrations for quick iterations
    var database = app.Services.GetRequiredService<Database>().Database;
    await database.EnsureCreatedAsync();
    await database.MigrateAsync();
}

app.Run();
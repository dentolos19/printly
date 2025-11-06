using DotNetEnv;
using DotNetEnv.Configuration;
using MocklyServer.Extensions;
using MocklyServer.Services;

Env.Load();

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

await app.SetupDevelopmentAsync();
await app.SetupRolesAsync();

app.UseHttpsRedirection();
app.MapControllers();

app.Run();
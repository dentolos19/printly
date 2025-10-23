using DotNetEnv.Configuration;
using EnterpriseServer.Extensions;
using EnterpriseServer.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddDotNetEnv();

builder.Services.SetupCors();
builder.Services.SetupAuth(builder);
builder.Services.SetupDatabase(builder);
builder.Services.SetupRouting();
builder.Services.SetupDocumentation();

var app = builder.Build();

app.SetupCors();
app.SetupAuth();
app.SetupDocumentation();

app.MapIdentityApi<User>();
await app.SetupRolesAsync();
app.MapControllers();

if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}
else
{
    app.UseDeveloperExceptionPage();
}

app.Run();
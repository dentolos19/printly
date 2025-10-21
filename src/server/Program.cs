using EnterpriseServer;
using EnterpriseServer.Models;
using EnterpriseServer.Extensions;
using Microsoft.AspNetCore.Identity;
using DotNetEnv.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddDotNetEnv();

builder.Services.AddDb(builder);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
builder.Services.AddAuthorization();
builder.Services.AddAuthPolicies();
builder.Services.AddIdentityApiEndpoints<User>().AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDbContext>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();
app.MapIdentityApi<User>();
await app.MapRoles();
app.MapControllers();

app.Run();
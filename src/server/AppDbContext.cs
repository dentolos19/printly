using EnterpriseServer.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseServer;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<User>(options) { }
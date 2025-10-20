
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using EnterpriseServer.Models;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseServer;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<User>(options)
{

}
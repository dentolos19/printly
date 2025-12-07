using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using PrintlyServer.Extensions;

namespace PrintlyServer;

public class DatabaseContextFactory : IDesignTimeDbContextFactory<DatabaseContext>
{
    public DatabaseContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<DatabaseContext>();
        if (!options.IsConfigured)
            options.UseDatabase();
        return new DatabaseContext(options.Options);
    }
}
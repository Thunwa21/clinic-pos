using ClinicPos.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RabbitMQ.Client;

namespace ClinicPos.Tests;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private static int _dbCounter;
    private readonly string _dbName = $"TestDb_{Interlocked.Increment(ref _dbCounter)}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var connString = $"DataSource={_dbName};Mode=Memory;Cache=Shared";

        builder.ConfigureServices(services =>
        {
            // Remove ALL EF Core / DbContext related registrations
            var descriptorsToRemove = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions<ClinicPosDbContext>)
                || d.ServiceType == typeof(DbContextOptions)
                || d.ServiceType.FullName?.Contains("EntityFrameworkCore") == true
                || d.ServiceType == typeof(ClinicPosDbContext)
            ).ToList();
            foreach (var d in descriptorsToRemove) services.Remove(d);

            // Remove real Redis
            var redisDescriptors = services.Where(
                d => d.ServiceType == typeof(Microsoft.Extensions.Caching.Distributed.IDistributedCache)
                  || d.ServiceType.FullName?.Contains("Redis") == true).ToList();
            foreach (var d in redisDescriptors) services.Remove(d);

            // Remove real RabbitMQ
            var rabbitDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IConnection));
            if (rabbitDescriptor != null) services.Remove(rabbitDescriptor);

            // Remove ALL health check registrations and re-add empty ones
            var healthDescriptors = services.Where(d =>
                d.ServiceType == typeof(HealthCheckService)
                || d.ServiceType.FullName?.Contains("HealthCheck") == true
                || (d.ImplementationType?.FullName?.Contains("HealthCheck") == true)
            ).ToList();
            foreach (var d in healthDescriptors) services.Remove(d);
            services.AddHealthChecks();

            // Add SQLite shared in-memory DB
            services.AddDbContext<ClinicPosDbContext>(options =>
                options.UseSqlite(connString)
                       .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

            // Add in-memory distributed cache
            services.AddDistributedMemoryCache();
        });
    }
}

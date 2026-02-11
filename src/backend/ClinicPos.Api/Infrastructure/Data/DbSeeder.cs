using System.Security.Cryptography;
using ClinicPos.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicPos.Api.Infrastructure.Data;

public static class DbSeeder
{
    // Tenant 1 — Clinic Sukhumvit
    private static readonly Guid Tenant1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Tenant1BranchA = Guid.Parse("aaaa0000-0000-0000-0000-000000000001");
    private static readonly Guid Tenant1BranchB = Guid.Parse("aaaa0000-0000-0000-0000-000000000002");

    // Tenant 2 — Clinic Silom
    private static readonly Guid Tenant2 = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Tenant2BranchA = Guid.Parse("bbbb0000-0000-0000-0000-000000000001");
    private static readonly Guid Tenant2BranchB = Guid.Parse("bbbb0000-0000-0000-0000-000000000002");

    public static async Task SeedAsync(ClinicPosDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Username == "admin"))
            return; // Already seeded

        // --- Tenants ---
        var tenants = new[]
        {
            new Tenant { Id = Tenant1, Code = "SKV", Name = "Clinic Sukhumvit" },
            new Tenant { Id = Tenant2, Code = "SLM", Name = "Clinic Silom" }
        };
        db.Tenants.AddRange(tenants);

        // --- Tenant 1 users ---
        var tenant1Users = new[]
        {
            new User
            {
                Username = "admin",
                PasswordHash = HashPassword("admin1234"),
                Role = Roles.Admin,
                TenantId = Tenant1,
                BranchId = Tenant1BranchA
            },
            new User
            {
                Username = "user",
                PasswordHash = HashPassword("user1234"),
                Role = Roles.User,
                TenantId = Tenant1,
                BranchId = Tenant1BranchB
            },
            new User
            {
                Username = "viewer",
                PasswordHash = HashPassword("viewer1234"),
                Role = Roles.Viewer,
                TenantId = Tenant1,
                BranchId = Tenant1BranchA
            }
        };

        // --- Tenant 2 users ---
        var tenant2Users = new[]
        {
            new User
            {
                Username = "admin2",
                PasswordHash = HashPassword("admin1234"),
                Role = Roles.Admin,
                TenantId = Tenant2,
                BranchId = Tenant2BranchA
            },
            new User
            {
                Username = "user2",
                PasswordHash = HashPassword("user1234"),
                Role = Roles.User,
                TenantId = Tenant2,
                BranchId = Tenant2BranchB
            },
            new User
            {
                Username = "viewer2",
                PasswordHash = HashPassword("viewer1234"),
                Role = Roles.Viewer,
                TenantId = Tenant2,
                BranchId = Tenant2BranchA
            }
        };

        db.Users.AddRange(tenant1Users);
        db.Users.AddRange(tenant2Users);
        await db.SaveChangesAsync();
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}

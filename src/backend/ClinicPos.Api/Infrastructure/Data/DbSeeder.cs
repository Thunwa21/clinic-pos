using System.Security.Cryptography;
using ClinicPos.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicPos.Api.Infrastructure.Data;

public static class DbSeeder
{
    // Tenant 1 — Aura Clinic Bangkok
    private static readonly Guid Tenant1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Tenant1BranchA = Guid.Parse("aaaa0000-0000-0000-0000-000000000001");
    private static readonly Guid Tenant1BranchB = Guid.Parse("aaaa0000-0000-0000-0000-000000000002");

    // Tenant 2 — Clinic Silom (for testing tenant isolation)
    private static readonly Guid Tenant2 = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Tenant2BranchA = Guid.Parse("bbbb0000-0000-0000-0000-000000000001");
    private static readonly Guid Tenant2BranchB = Guid.Parse("bbbb0000-0000-0000-0000-000000000002");

    public static async Task SeedAsync(ClinicPosDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Username == "admin@aura"))
            return; // Already seeded

        // --- Tenants ---
        var tenants = new[]
        {
            new Tenant { Id = Tenant1, Code = "AURA", Name = "Aura Clinic Bangkok" },
            new Tenant { Id = Tenant2, Code = "SLM", Name = "Clinic Silom" }
        };
        db.Tenants.AddRange(tenants);

        // --- Branches ---
        var branches = new[]
        {
            new Branch { Id = Tenant1BranchA, TenantId = Tenant1, Name = "Siam Branch", Address = "Siam Square, Bangkok", PhoneNumber = "02-111-1111" },
            new Branch { Id = Tenant1BranchB, TenantId = Tenant1, Name = "Thonglor Branch", Address = "Thonglor, Bangkok", PhoneNumber = "02-222-2222" },
            new Branch { Id = Tenant2BranchA, TenantId = Tenant2, Name = "Silom Main", Address = "Silom Road, Bangkok", PhoneNumber = "02-333-3333" },
            new Branch { Id = Tenant2BranchB, TenantId = Tenant2, Name = "Sathorn Branch", Address = "Sathorn, Bangkok", PhoneNumber = "02-444-4444" }
        };
        db.Branches.AddRange(branches);

        // --- Tenant 1 users ---
        var adminUser = new User
        {
            Username = "admin@aura",
            PasswordHash = HashPassword("Admin123!"),
            FullName = "Admin Aura",
            Role = Roles.Admin,
            TenantId = Tenant1
        };

        var normalUser = new User
        {
            Username = "user@aura",
            PasswordHash = HashPassword("User123!"),
            FullName = "User Aura",
            Role = Roles.User,
            TenantId = Tenant1
        };

        var viewerUser = new User
        {
            Username = "viewer@aura",
            PasswordHash = HashPassword("Viewer123!"),
            FullName = "Viewer Aura",
            Role = Roles.Viewer,
            TenantId = Tenant1
        };

        db.Users.AddRange(adminUser, normalUser, viewerUser);

        // --- Tenant 2 users ---
        var admin2 = new User
        {
            Username = "admin@silom",
            PasswordHash = HashPassword("Admin123!"),
            FullName = "Admin Silom",
            Role = Roles.Admin,
            TenantId = Tenant2
        };

        db.Users.Add(admin2);
        await db.SaveChangesAsync();

        // --- UserBranch associations ---
        var userBranches = new[]
        {
            // admin@aura → both branches
            new UserBranch { UserId = adminUser.Id, BranchId = Tenant1BranchA },
            new UserBranch { UserId = adminUser.Id, BranchId = Tenant1BranchB },
            // user@aura → Siam Branch only
            new UserBranch { UserId = normalUser.Id, BranchId = Tenant1BranchA },
            // viewer@aura → Thonglor Branch only
            new UserBranch { UserId = viewerUser.Id, BranchId = Tenant1BranchB },
            // admin@silom → both Silom branches
            new UserBranch { UserId = admin2.Id, BranchId = Tenant2BranchA },
            new UserBranch { UserId = admin2.Id, BranchId = Tenant2BranchB }
        };
        db.UserBranches.AddRange(userBranches);

        // --- Sample patients ---
        var patients = new[]
        {
            new Patient { TenantId = Tenant1, FirstName = "สมชาย", LastName = "ใจดี", PhoneNumber = "081-111-1111", PrimaryBranchId = Tenant1BranchA },
            new Patient { TenantId = Tenant1, FirstName = "สมหญิง", LastName = "รักสวย", PhoneNumber = "081-222-2222", PrimaryBranchId = Tenant1BranchB },
            new Patient { TenantId = Tenant1, FirstName = "วิชัย", LastName = "สุขสันต์", PhoneNumber = "081-333-3333", PrimaryBranchId = Tenant1BranchA },
        };
        db.Patients.AddRange(patients);

        await db.SaveChangesAsync();
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}

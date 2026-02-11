using ClinicPos.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicPos.Api.Infrastructure.Data;

public class ClinicPosDbContext : DbContext
{
    private readonly Guid? _currentTenantId;

    public ClinicPosDbContext(DbContextOptions<ClinicPosDbContext> options)
        : base(options)
    {
    }

    public ClinicPosDbContext(DbContextOptions<ClinicPosDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _currentTenantId = tenantContext.TenantId;
    }

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<UserBranch> UserBranches => Set<UserBranch>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- Tenant ---
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Code).HasMaxLength(10);
            entity.Property(t => t.Name).HasMaxLength(200);
            entity.HasIndex(t => t.Code).IsUnique();
        });

        // --- Branch ---
        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Name).HasMaxLength(200);
            entity.Property(b => b.Address).HasMaxLength(500);
            entity.Property(b => b.PhoneNumber).HasMaxLength(50);

            entity.HasOne<Tenant>()
                .WithMany()
                .HasForeignKey(b => b.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Patient ---
        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.FirstName).HasMaxLength(200);
            entity.Property(p => p.LastName).HasMaxLength(200);
            entity.Property(p => p.PhoneNumber).HasMaxLength(50);

            entity.HasIndex(p => new { p.TenantId, p.PhoneNumber }).IsUnique();

            entity.HasOne<Tenant>()
                .WithMany()
                .HasForeignKey(p => p.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Branch>()
                .WithMany()
                .HasForeignKey(p => p.PrimaryBranchId)
                .OnDelete(DeleteBehavior.SetNull);

            // Global query filter for tenant isolation
            entity.HasQueryFilter(p => _currentTenantId == null || p.TenantId == _currentTenantId);
        });

        // --- User ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Username).HasMaxLength(100);
            entity.Property(u => u.PasswordHash).HasMaxLength(200);
            entity.Property(u => u.FullName).HasMaxLength(200);
            entity.Property(u => u.Role).HasMaxLength(20);

            entity.HasIndex(u => u.Username).IsUnique();

            entity.HasOne<Tenant>()
                .WithMany()
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- UserBranch ---
        modelBuilder.Entity<UserBranch>(entity =>
        {
            entity.HasKey(ub => ub.Id);

            entity.HasIndex(ub => new { ub.UserId, ub.BranchId }).IsUnique();

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(ub => ub.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Branch>()
                .WithMany()
                .HasForeignKey(ub => ub.BranchId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

using ClinicPos.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicPos.Api.Infrastructure.Data;

public class ClinicPosDbContext : DbContext
{
    public ClinicPosDbContext(DbContextOptions<ClinicPosDbContext> options)
        : base(options)
    {
    }

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Tenant> Tenants => Set<Tenant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.FirstName).HasMaxLength(200);
            entity.Property(p => p.LastName).HasMaxLength(200);
            entity.Property(p => p.PhoneNumber).HasMaxLength(50);

            entity.HasIndex(p => new { p.TenantId, p.PhoneNumber }).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Username).HasMaxLength(100);
            entity.Property(u => u.PasswordHash).HasMaxLength(200);
            entity.Property(u => u.Role).HasMaxLength(20);

            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Code).HasMaxLength(10);
            entity.Property(t => t.Name).HasMaxLength(200);

            entity.HasIndex(t => t.Code).IsUnique();
        });
    }
}

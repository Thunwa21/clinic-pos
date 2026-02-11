using System.Text.Json;
using ClinicPos.Api.Application;
using ClinicPos.Api.Domain.Entities;
using ClinicPos.Api.Infrastructure;
using ClinicPos.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace ClinicPos.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly ClinicPosDbContext _db;
    private readonly IDistributedCache _cache;
    private readonly ITenantContext _tenantContext;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public PatientsController(ClinicPosDbContext db, IDistributedCache cache, ITenantContext tenantContext)
    {
        _db = db;
        _cache = cache;
        _tenantContext = tenantContext;
    }

    [HttpPost]
    [Authorize(Policy = "CanCreatePatient")]
    public async Task<IActionResult> Create([FromBody] CreatePatientRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId == null)
            return Forbid();

        // Validate branch belongs to tenant if provided
        if (request.PrimaryBranchId.HasValue)
        {
            var branchExists = await _db.Branches
                .AnyAsync(b => b.Id == request.PrimaryBranchId.Value && b.TenantId == tenantId.Value);
            if (!branchExists)
                return BadRequest(new { error = "Branch does not belong to your tenant." });
        }

        var patient = new Patient
        {
            TenantId = tenantId.Value,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            PrimaryBranchId = request.PrimaryBranchId
        };

        _db.Patients.Add(patient);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("duplicate key") == true
                                            || ex.InnerException?.Message.Contains("unique constraint") == true
                                            || ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
        {
            return Conflict(new { error = "A patient with this phone number already exists in this tenant." });
        }

        // Invalidate cache for this tenant (all + specific branch)
        await InvalidateCacheAsync(tenantId.Value, patient.PrimaryBranchId);

        return CreatedAtAction(nameof(GetByTenant), null, ToResponse(patient));
    }

    [HttpGet]
    [Authorize(Policy = "CanViewPatient")]
    public async Task<IActionResult> GetByTenant([FromQuery] Guid? branchId)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId == null)
            return Forbid();

        var cacheKey = BuildCacheKey(tenantId.Value, branchId);

        // Try cache first
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
            return Ok(JsonSerializer.Deserialize<List<PatientResponse>>(cached));

        // Global query filter automatically applies TenantId filter
        var query = _db.Patients.AsQueryable();

        if (branchId.HasValue)
            query = query.Where(p => p.PrimaryBranchId == branchId.Value);

        var patients = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => ToResponse(p))
            .ToListAsync();

        // Store in cache
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(patients), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheTtl
        });

        return Ok(patients);
    }

    private static string BuildCacheKey(Guid tenantId, Guid? branchId)
        => $"tenant:{tenantId}:patients:list:{branchId?.ToString() ?? "all"}";

    private async Task InvalidateCacheAsync(Guid tenantId, Guid? branchId)
    {
        // Always invalidate the "all" key
        await _cache.RemoveAsync(BuildCacheKey(tenantId, null));

        // Also invalidate the specific branch key if applicable
        if (branchId.HasValue)
            await _cache.RemoveAsync(BuildCacheKey(tenantId, branchId));
    }

    private static PatientResponse ToResponse(Patient p) => new()
    {
        Id = p.Id,
        TenantId = p.TenantId,
        FirstName = p.FirstName,
        LastName = p.LastName,
        PhoneNumber = p.PhoneNumber,
        CreatedAt = p.CreatedAt,
        PrimaryBranchId = p.PrimaryBranchId
    };
}

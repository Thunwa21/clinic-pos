using ClinicPos.Api.Application;
using ClinicPos.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPos.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class BranchesController : ControllerBase
{
    private readonly ClinicPosDbContext _db;

    public BranchesController(ClinicPosDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetByTenant()
    {
        var tenantId = GetTenantId();
        if (tenantId == null)
            return Forbid();

        var branches = await _db.Branches
            .Where(b => b.TenantId == tenantId.Value)
            .OrderBy(b => b.Name)
            .Select(b => new BranchInfo { Id = b.Id, Name = b.Name })
            .ToListAsync();

        return Ok(branches);
    }

    private Guid? GetTenantId()
    {
        var claim = User.FindFirst("TenantId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

using BackendCsharp.Contracts;
using BackendCsharp.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendCsharp;

[ApiController]
[Route("bio-pages")]
public class BioPagesController(BioPagesService bioPagesService) : ControllerBase
{
    [HttpGet]
    public IActionResult FindAll()
    {
        return Ok(bioPagesService.FindAll());
    }

    [HttpGet("{id}")]
    public IActionResult FindOne(string id)
    {
        var bioPage = bioPagesService.FindOne(id);
        return bioPage is null ? NotFound(new { message = "Bio page not found" }) : Ok(bioPage);
    }

    [HttpGet("handle/{handle}")]
    public IActionResult FindOneByHandle(string handle)
    {
        var bioPage = bioPagesService.FindOneByHandle(handle);
        return bioPage is null ? NotFound(new { message = "Bio page not found" }) : Ok(bioPage);
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateBioPageRequest payload)
    {
        if (!BioPagesService.IsValidCreatePayload(payload))
        {
            return BadRequest(new { message = "Invalid payload" });
        }

        try
        {
            var created = bioPagesService.Create(payload);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}")]
    public IActionResult Update(string id, [FromBody] UpdateBioPageRequest payload)
    {
        if (!BioPagesService.IsValidUpdatePayload(payload))
        {
            return BadRequest(new { message = "Invalid payload" });
        }

        try
        {
            var updated = bioPagesService.Update(id, payload);
            return updated is null ? NotFound(new { message = "Bio page not found" }) : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}

namespace BackendCsharp.Models;

public class BioPage
{
    public required string Id { get; set; }
    public required string Handle { get; set; }
    public required string DisplayName { get; set; }
    public required string Bio { get; set; }
    public required List<BioLink> Links { get; set; }
    public required string CreatedAt { get; set; }
    public required string UpdatedAt { get; set; }
}

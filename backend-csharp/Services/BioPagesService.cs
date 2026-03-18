using System.Text.Json;
using BackendCsharp.Contracts;
using BackendCsharp.Models;
using Microsoft.Data.Sqlite;

namespace BackendCsharp.Services;

public class BioPagesService : IDisposable
{
    private readonly SqliteConnection _connection;

    public BioPagesService()
    {
        _connection = new SqliteConnection("Data Source=secure-bio-api;Mode=Memory;Cache=Shared");
        _connection.Open();

        InitializeSchema();
        SeedData();
    }

    public List<BioPage> FindAll()
    {
        using var command = _connection.CreateCommand();
        command.CommandText =
            "SELECT id, handle, display_name, bio, links_json, created_at, updated_at FROM bio_pages ORDER BY created_at DESC;";

        using var reader = command.ExecuteReader();
        var pages = new List<BioPage>();
        while (reader.Read())
        {
            pages.Add(MapRow(reader));
        }

        return pages;
    }

    public BioPage? FindOne(string id)
    {
        using var command = _connection.CreateCommand();
        command.CommandText =
            "SELECT id, handle, display_name, bio, links_json, created_at, updated_at FROM bio_pages WHERE id = $id;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();
        return reader.Read() ? MapRow(reader) : null;
    }

    public BioPage? FindOneByHandle(string handle)
    {
        using var command = _connection.CreateCommand();
        command.CommandText =
            "SELECT id, handle, display_name, bio, links_json, created_at, updated_at FROM bio_pages WHERE handle = $handle;";
        command.Parameters.AddWithValue("$handle", handle);

        using var reader = command.ExecuteReader();
        return reader.Read() ? MapRow(reader) : null;
    }

    public BioPage Create(CreateBioPageRequest payload)
    {
        EnsureHandleAvailable(payload.Handle!, null);

        var now = DateTime.UtcNow.ToString("O");
        var id = Guid.NewGuid().ToString();

        using var command = _connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO bio_pages (id, handle, display_name, bio, links_json, created_at, updated_at)
            VALUES ($id, $handle, $displayName, $bio, $linksJson, $createdAt, $updatedAt);";
        command.Parameters.AddWithValue("$id", id);
        command.Parameters.AddWithValue("$handle", payload.Handle!.Trim());
        command.Parameters.AddWithValue("$displayName", payload.DisplayName!.Trim());
        command.Parameters.AddWithValue("$bio", payload.Bio!.Trim());
        command.Parameters.AddWithValue("$linksJson", SerializeLinks(payload.Links));
        command.Parameters.AddWithValue("$createdAt", now);
        command.Parameters.AddWithValue("$updatedAt", now);
        command.ExecuteNonQuery();

        return FindOne(id)!;
    }

    public BioPage? Update(string id, UpdateBioPageRequest payload)
    {
        var existing = FindOne(id);
        if (existing is null)
        {
            return null;
        }

        var nextHandle = payload.Handle?.Trim() ?? existing.Handle;
        var nextDisplayName = payload.DisplayName?.Trim() ?? existing.DisplayName;
        var nextBio = payload.Bio?.Trim() ?? existing.Bio;
        var nextLinks = payload.Links is null ? existing.Links : NormalizeLinks(payload.Links);

        if (!string.Equals(nextHandle, existing.Handle, StringComparison.Ordinal))
        {
            EnsureHandleAvailable(nextHandle, id);
        }

        using var command = _connection.CreateCommand();
        command.CommandText = @"
            UPDATE bio_pages
            SET handle = $handle,
                display_name = $displayName,
                bio = $bio,
                links_json = $linksJson,
                updated_at = $updatedAt
            WHERE id = $id;";
        command.Parameters.AddWithValue("$id", id);
        command.Parameters.AddWithValue("$handle", nextHandle);
        command.Parameters.AddWithValue("$displayName", nextDisplayName);
        command.Parameters.AddWithValue("$bio", nextBio);
        command.Parameters.AddWithValue("$linksJson", JsonSerializer.Serialize(nextLinks));
        command.Parameters.AddWithValue("$updatedAt", DateTime.UtcNow.ToString("O"));
        command.ExecuteNonQuery();

        return FindOne(id);
    }

    public static bool IsValidCreatePayload(CreateBioPageRequest payload)
    {
        return !string.IsNullOrWhiteSpace(payload.Handle)
            && payload.Handle.Length is >= 2 and <= 30
            && !string.IsNullOrWhiteSpace(payload.DisplayName)
            && payload.DisplayName.Length is >= 1 and <= 80
            && !string.IsNullOrWhiteSpace(payload.Bio)
            && payload.Bio.Length is >= 1 and <= 240
            && AreLinksValid(payload.Links);
    }

    public static bool IsValidUpdatePayload(UpdateBioPageRequest payload)
    {
        if (payload.Handle is not null && payload.Handle.Length is < 2 or > 30)
        {
            return false;
        }

        if (payload.DisplayName is not null && payload.DisplayName.Length is < 1 or > 80)
        {
            return false;
        }

        if (payload.Bio is not null && payload.Bio.Length is < 1 or > 240)
        {
            return false;
        }

        return AreLinksValid(payload.Links);
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private void InitializeSchema()
    {
        using var command = _connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS bio_pages (
                id TEXT PRIMARY KEY,
                handle TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                bio TEXT NOT NULL,
                links_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );";
        command.ExecuteNonQuery();
    }

    private void SeedData()
    {
        using var countCommand = _connection.CreateCommand();
        countCommand.CommandText = "SELECT COUNT(*) FROM bio_pages;";
        var count = Convert.ToInt32(countCommand.ExecuteScalar());
        if (count > 0)
        {
            return;
        }

        var now = DateTime.UtcNow.ToString("O");
        var seeds = new[]
        {
            new
            {
                Handle = "jane-sec",
                DisplayName = "Jane Rivera",
                Bio = "Security engineer building developer-safe auth systems.",
                Links = new List<BioLink>
                {
                    new() { Label = "Portfolio", Url = "https://example.com/jane" },
                    new() { Label = "LinkedIn", Url = "https://linkedin.com/in/janerivera" }
                }
            },
            new
            {
                Handle = "matt-devrel",
                DisplayName = "Matt Lee",
                Bio = "DevRel lead sharing API and platform engineering lessons.",
                Links = new List<BioLink>
                {
                    new() { Label = "Blog", Url = "https://example.com/matt/blog" },
                    new() { Label = "X", Url = "https://x.com/mattdevrel" }
                }
            },
            new
            {
                Handle = "priya-product",
                DisplayName = "Priya Nair",
                Bio = "Product manager focused on creator tools and monetization.",
                Links = new List<BioLink>
                {
                    new() { Label = "Newsletter", Url = "https://example.com/priya/news" },
                    new() { Label = "Website", Url = "https://example.com/priya" }
                }
            }
        };

        foreach (var seed in seeds)
        {
            using var insert = _connection.CreateCommand();
            insert.CommandText = @"
                INSERT INTO bio_pages (id, handle, display_name, bio, links_json, created_at, updated_at)
                VALUES ($id, $handle, $displayName, $bio, $linksJson, $createdAt, $updatedAt);";
            insert.Parameters.AddWithValue("$id", Guid.NewGuid().ToString());
            insert.Parameters.AddWithValue("$handle", seed.Handle);
            insert.Parameters.AddWithValue("$displayName", seed.DisplayName);
            insert.Parameters.AddWithValue("$bio", seed.Bio);
            insert.Parameters.AddWithValue("$linksJson", JsonSerializer.Serialize(seed.Links));
            insert.Parameters.AddWithValue("$createdAt", now);
            insert.Parameters.AddWithValue("$updatedAt", now);
            insert.ExecuteNonQuery();
        }
    }

    private static bool AreLinksValid(List<BioLinkRequest>? links)
    {
        if (links is null)
        {
            return true;
        }

        if (links.Count > 8)
        {
            return false;
        }

        return links.All(link =>
            !string.IsNullOrWhiteSpace(link.Label)
            && link.Label!.Length is >= 1 and <= 50
            && !string.IsNullOrWhiteSpace(link.Url));
    }

    private static List<BioLink> NormalizeLinks(List<BioLinkRequest> links)
    {
        return links
            .Where(link => !string.IsNullOrWhiteSpace(link.Label) && !string.IsNullOrWhiteSpace(link.Url))
            .Select(link => new BioLink
            {
                Label = link.Label!.Trim(),
                Url = link.Url!.Trim()
            })
            .ToList();
    }

    private static string SerializeLinks(List<BioLinkRequest>? links)
    {
        return JsonSerializer.Serialize(links is null ? [] : NormalizeLinks(links));
    }

    private static BioPage MapRow(SqliteDataReader reader)
    {
        var linksJson = reader.GetString(reader.GetOrdinal("links_json"));
        var links = JsonSerializer.Deserialize<List<BioLink>>(linksJson) ?? [];

        return new BioPage
        {
            Id = reader.GetString(reader.GetOrdinal("id")),
            Handle = reader.GetString(reader.GetOrdinal("handle")),
            DisplayName = reader.GetString(reader.GetOrdinal("display_name")),
            Bio = reader.GetString(reader.GetOrdinal("bio")),
            Links = links,
            CreatedAt = reader.GetString(reader.GetOrdinal("created_at")),
            UpdatedAt = reader.GetString(reader.GetOrdinal("updated_at"))
        };
    }

    private void EnsureHandleAvailable(string handle, string? existingId)
    {
        using var command = _connection.CreateCommand();
        command.CommandText = "SELECT id FROM bio_pages WHERE handle = $handle;";
        command.Parameters.AddWithValue("$handle", handle);

        var foundId = command.ExecuteScalar() as string;
        if (!string.IsNullOrWhiteSpace(foundId) && foundId != existingId)
        {
            throw new InvalidOperationException("Handle already exists");
        }
    }
}

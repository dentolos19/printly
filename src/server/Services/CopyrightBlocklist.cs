using System.Text.RegularExpressions;

namespace PrintlyServer.Services;

public static class CopyrightBlocklist
{
    /// <summary>
    /// Maps copyrighted terms (lowercase) to descriptive alternatives that avoid trademark infringement.
    /// </summary>
    private static readonly Dictionary<string, string> Entries = new(StringComparer.OrdinalIgnoreCase)
    {
        // Disney characters
        ["mickey mouse"] = "a cheerful cartoon mouse with round ears and red shorts",
        ["minnie mouse"] = "a cheerful cartoon mouse with a polka-dot bow and dress",
        ["donald duck"] = "an animated duck in a sailor outfit",
        ["goofy"] = "a tall, clumsy cartoon dog character",
        ["pluto"] = "an animated pet dog with floppy ears",
        ["cinderella"] = "a fairy-tale princess in a sparkling ball gown",
        ["elsa"] = "an ice-powered princess with a long braid and blue gown",
        ["anna"] = "a brave princess with braided red hair",
        ["moana"] = "a Polynesian adventurer girl on a ocean voyage",
        ["rapunzel"] = "a long-haired princess locked in a tall tower",
        ["simba"] = "a young lion cub destined to be king of the savanna",
        ["nemo"] = "a small orange clownfish with a lucky fin",
        ["buzz lightyear"] = "a space ranger action figure with wings and a helmet",
        ["woody"] = "a cowboy pull-string doll with a sheriff badge",
        ["stitch"] = "a small blue alien creature with large ears",
        ["tinker bell"] = "a tiny fairy with translucent wings and a green dress",

        // Pixar
        ["wall-e"] = "a lonely waste-collecting robot on an abandoned earth",
        ["ratatouille"] = "a small gray rat who dreams of being a gourmet chef",

        // Marvel characters
        ["spider-man"] = "a web-slinging superhero in a red and blue suit",
        ["spiderman"] = "a web-slinging superhero in a red and blue suit",
        ["iron man"] = "a superhero wearing a red and gold powered armor suit",
        ["captain america"] = "a patriotic superhero with a star-spangled shield",
        ["thor"] = "a Norse god of thunder wielding a mighty hammer",
        ["hulk"] = "a massive green-skinned muscular hero",
        ["black widow"] = "a stealthy female spy and fighter in a black suit",
        ["black panther"] = "a regal warrior in a sleek black vibranium suit",
        ["deadpool"] = "a wisecracking anti-hero in a red and black suit",
        ["wolverine"] = "a rugged mutant hero with retractable metal claws",
        ["thanos"] = "a powerful purple-skinned titan with a golden gauntlet",
        ["avengers"] = "a team of powerful superheroes defending the world",

        // DC characters
        ["batman"] = "a dark vigilante hero in a cape and cowl",
        ["superman"] = "a caped flying hero with super strength and an 'S' emblem",
        ["wonder woman"] = "an Amazonian warrior princess with a golden lasso",
        ["the flash"] = "a superhero with incredible speed and a lightning bolt emblem",
        ["aquaman"] = "an underwater king wielding a golden trident",
        ["joker"] = "a chaotic clown villain with green hair and a purple suit",
        ["harley quinn"] = "a playful villain with pigtails and a mallet",

        // Pokemon
        ["pikachu"] = "a cute yellow electric rodent creature with red cheeks",
        ["pokemon"] = "collectible pocket-sized fantasy creatures",
        ["charizard"] = "a large orange dragon-like fire-breathing creature",
        ["eevee"] = "a small fluffy brown creature that can evolve into many forms",
        ["mewtwo"] = "a powerful psychic feline creature",
        ["bulbasaur"] = "a small green creature with a plant bulb on its back",
        ["squirtle"] = "a small blue turtle creature",
        ["jigglypuff"] = "a round pink singing balloon creature",
        ["snorlax"] = "a huge sleepy bear-like creature",
        ["gengar"] = "a shadowy purple ghost creature with a wide grin",

        // Nintendo
        ["mario"] = "a mustached plumber in red overalls and a red cap",
        ["super mario"] = "a mustached plumber hero on a platform adventure",
        ["luigi"] = "a tall mustached plumber in green overalls",
        ["princess peach"] = "a royal princess in a pink gown with a crown",
        ["bowser"] = "a large spiked turtle-dragon king villain",
        ["link"] = "a green-clad elven hero with a sword and shield",
        ["zelda"] = "a wise elven princess with magical powers",
        ["kirby"] = "a small round pink creature that can inhale and copy abilities",
        ["donkey kong"] = "a powerful gorilla wearing a red necktie",
        ["yoshi"] = "a friendly green dinosaur with a large nose",
        ["metroid"] = "an armored bounty hunter in an orange power suit",
        ["samus"] = "an armored bounty hunter in an orange power suit",

        // Anime / Manga
        ["naruto"] = "a young ninja with spiky blond hair and whisker marks",
        ["goku"] = "a powerful martial artist with spiky black hair",
        ["dragon ball"] = "magical glowing orbs that grant wishes when collected",
        ["one piece"] = "a straw hat-wearing pirate on a grand adventure",
        ["luffy"] = "a stretchy rubber pirate boy with a straw hat",
        ["sailor moon"] = "a magical girl warrior with long blonde pigtails and a tiara",
        ["totoro"] = "a giant fluffy forest spirit with a wide smile",
        ["spirited away"] = "a young girl in a magical bathhouse spirit world",
        ["attack on titan"] = "giant humanoid creatures beyond enormous walls",

        // Video game characters
        ["master chief"] = "a futuristic super-soldier in green powered armor with a visor",
        ["sonic"] = "a fast blue hedgehog with red sneakers",
        ["crash bandicoot"] = "an orange bandicoot with a goofy grin spinning through jungles",
        ["lara croft"] = "a fearless female archaeologist and adventurer",
        ["kratos"] = "a pale ash-skinned warrior wielding blades on chains",
        ["minecraft"] = "a blocky voxel sandbox world with pixelated creatures",
        ["creeper"] = "a green blocky creature that silently approaches and explodes",
        ["fortnite"] = "battle royale characters in a colorful island arena",
        ["among us"] = "colorful bean-shaped astronaut crewmates on a spaceship",
        ["roblox"] = "blocky avatar characters in a virtual playground",

        // Famous logos / brands
        ["nike"] = "a curved swoosh checkmark logo",
        ["adidas"] = "three parallel diagonal stripes",
        ["apple logo"] = "a bitten fruit silhouette",
        ["coca-cola"] = "a classic red and white cursive soft drink label",
        ["pepsi"] = "a red, white, and blue circular soft drink emblem",
        ["mcdonald's"] = "golden arches forming the letter M",
        ["mcdonalds"] = "golden arches forming the letter M",
        ["starbucks"] = "a green circular coffee emblem with a twin-tailed siren",
        ["ferrari"] = "a prancing horse emblem on a yellow shield",
        ["lamborghini"] = "a charging bull emblem on a dark shield",
        ["supreme"] = "bold white text in a red rectangular box",
        ["louis vuitton"] = "interlocking L and V monogram pattern",
        ["gucci"] = "interlocking double G monogram",
        ["chanel"] = "interlocking double C monogram",
        ["rolex"] = "a golden crown emblem above elegant text",
        ["nasa"] = "a red chevron with stars and an orbital path on a blue circle",

        // Sports teams / leagues
        ["nba"] = "a professional basketball league silhouette logo",
        ["nfl"] = "a professional American football league shield logo",
        ["mlb"] = "a professional baseball league silhouette logo",
        ["fifa"] = "a global football/soccer governing body emblem",
        ["olympics"] = "five interlocking colored rings representing unity",
        ["olympic rings"] = "five interlocking colored rings representing unity",

        // Media / Entertainment
        ["star wars"] = "an epic space opera saga with laser swords and galactic battles",
        ["darth vader"] = "a dark armored villain with a black helmet and heavy breathing",
        ["yoda"] = "a small wise green alien elder with pointed ears",
        ["baby yoda"] = "a small green alien child with large eyes and pointy ears",
        ["grogu"] = "a small green alien child with large eyes and pointy ears",
        ["lightsaber"] = "a glowing energy blade weapon",
        ["harry potter"] = "a young wizard with round glasses and a lightning scar",
        ["hogwarts"] = "a grand medieval magical castle school",
        ["lord of the rings"] = "an epic fantasy saga about a quest to destroy a powerful ring",
        ["gandalf"] = "an elderly wizard with a long beard, staff, and pointed hat",
        ["game of thrones"] = "a medieval fantasy saga of warring noble houses and dragons",
        ["transformers"] = "giant robots that can change into vehicles",
        ["barbie"] = "a fashionable blonde doll in stylish outfits",
        ["hello kitty"] = "a simple white cartoon cat with a bow and no mouth",
        ["spongebob"] = "a cheerful yellow kitchen sponge living under the sea",
        ["peppa pig"] = "a small pink cartoon pig with a round snout",
        ["paw patrol"] = "a team of heroic rescue puppies",
        ["bluey"] = "an energetic blue heeler puppy and her family",

        // Music / bands (when used as design elements)
        ["rolling stones"] = "a pair of red lips with a protruding tongue icon",
        ["grateful dead"] = "a colorful skull with a lightning bolt and roses",
        ["nirvana"] = "a yellow smiley face with crossed-out eyes",

        // Tech logos
        ["google"] = "a multicolored text search engine logo",
        ["microsoft"] = "a four-pane colored window square logo",
        ["amazon"] = "an orange arrow smiling from A to Z",
        ["facebook"] = "a lowercase white 'f' on a blue background",
        ["instagram"] = "a gradient camera icon with rounded edges",
        ["twitter"] = "a small blue bird silhouette",
        ["tiktok"] = "a vibrating musical note icon in black, teal, and red",
        ["youtube"] = "a red rounded rectangle with a white play triangle",
        ["snapchat"] = "a white ghost outline on a yellow background",
        ["tesla"] = "a stylized letter T resembling an electric motor cross-section",
    };

    /// <summary>
    /// Compiled regex patterns for efficient matching, ordered longest-first to match the
    /// most specific term when entries overlap (e.g. "super mario" before "mario").
    /// </summary>
    private static readonly List<(string Term, string Replacement, Regex Pattern)> CompiledPatterns = Entries
        .OrderByDescending(e => e.Key.Length)
        .Select(e =>
            (e.Key, e.Value, new Regex($@"\b{Regex.Escape(e.Key)}\b", RegexOptions.IgnoreCase | RegexOptions.Compiled))
        )
        .ToList();

    /// <summary>
    /// Scans a prompt for copyrighted terms and returns all matches with their suggested replacements.
    /// </summary>
    public static List<(string MatchedTerm, string Replacement)> ScanPrompt(string prompt)
    {
        var results = new List<(string, string)>();
        var alreadyMatched = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (term, replacement, pattern) in CompiledPatterns)
        {
            if (alreadyMatched.Contains(term))
                continue;

            if (pattern.IsMatch(prompt))
            {
                results.Add((term, replacement));
                alreadyMatched.Add(term);
            }
        }

        return results;
    }

    /// <summary>
    /// Rewrites a prompt by replacing all copyrighted terms with their descriptive alternatives.
    /// </summary>
    public static string RewritePrompt(string prompt)
    {
        var result = prompt;

        foreach (var (_, replacement, pattern) in CompiledPatterns)
        {
            result = pattern.Replace(result, replacement);
        }

        return result;
    }
}

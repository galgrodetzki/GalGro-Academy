// YouTube URL helpers
//
// Drill video URLs come in three shapes:
//   1. Real video links:   https://www.youtube.com/watch?v=ABC123
//                          https://youtu.be/ABC123
//                          https://www.youtube.com/embed/ABC123
//                          https://www.youtube.com/shorts/ABC123
//   2. Search URLs:        https://www.youtube.com/results?search_query=...
//   3. null / undefined
//
// `extractYouTubeId` returns the 11-char video id or `null` when the URL is
// a search link or anything unparseable. Thumbnail + embed helpers return
// `null` when no id is extractable so callers can render a graceful fallback.

const ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // Short form: youtu.be/<id>
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return ID_REGEX.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      // Search URLs have no video id
      if (u.pathname === "/results") return null;

      // /watch?v=<id>
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && ID_REGEX.test(id) ? id : null;
      }

      // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
        const id = parts[1];
        return ID_REGEX.test(id) ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnail(url, quality = "hq") {
  const id = extractYouTubeId(url);
  if (!id) return null;
  // hqdefault = 480x360, mqdefault = 320x180, maxresdefault = not always available
  const q = quality === "max" ? "maxresdefault" : quality === "mq" ? "mqdefault" : "hqdefault";
  return `https://i.ytimg.com/vi/${id}/${q}.jpg`;
}

export function hasPlayableVideo(url) {
  return extractYouTubeId(url) !== null;
}

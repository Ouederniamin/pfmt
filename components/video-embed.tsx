type VideoEmbedProps = {
  url?: string | null;
};

function extractYoutubeId(url?: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match?.[1] ?? null;
}

export function VideoEmbed({ url }: VideoEmbedProps) {
  const id = extractYoutubeId(url);

  if (!id) {
    return <p className="text-sm text-text-muted">Aucune vidéo disponible pour ce chapitre.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube.com/embed/${id}`}
        title="Video du chapitre"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

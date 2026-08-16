export function ArtistPolaroid() {
  return (
    <figure className="artist-polaroid" aria-label="KiiiKiii demo artist photo">
      <div className="artist-polaroid__image" aria-hidden="true">
        <strong>KiiiKiii</strong>
        <div className="artist-silhouettes">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>
      <figcaption>SEOUL · 2026</figcaption>
    </figure>
  );
}


// The app's signature interaction: rate albums 0.5-5 using small vinyl-record
// icons instead of stars. Each record can be half or fully "pressed" (filled).
export default function GrooveRating({ value = 0, onChange, size = 28, readOnly = false }) {
  const discs = [1, 2, 3, 4, 5];

  function fillFor(discIndex) {
    if (value >= discIndex) return 'full';
    if (value >= discIndex - 0.5) return 'half';
    return 'none';
  }

  function handleClick(discIndex, half) {
    if (readOnly || !onChange) return;
    const next = half === 'left' ? discIndex - 0.5 : discIndex;
    onChange(next);
  }

  return (
    <div className="flex items-center gap-1.5" role={readOnly ? undefined : 'radiogroup'} aria-label="Rating">
      {discs.map((d) => {
        const fill = fillFor(d);
        return (
          <div
            key={d}
            className="relative"
            style={{ width: size, height: size }}
          >
            <svg viewBox="0 0 32 32" width={size} height={size}>
              <circle cx="16" cy="16" r="14.5" fill="none" stroke="#3A3D4A" strokeWidth="1.5" />
              {fill !== 'none' && (
                <path
                  d={
                    fill === 'full'
                      ? 'M16 1.5 A14.5 14.5 0 1 1 15.99 1.5 Z'
                      : 'M16 1.5 A14.5 14.5 0 0 0 16 30.5 Z'
                  }
                  fill="#E8A33D"
                />
              )}
              <circle cx="16" cy="16" r="4" fill="#14151A" />
            </svg>
            {!readOnly && (
              <>
                <button
                  type="button"
                  aria-label={`Rate ${d - 0.5}`}
                  className="absolute inset-y-0 left-0 w-1/2"
                  onClick={() => handleClick(d, 'left')}
                />
                <button
                  type="button"
                  aria-label={`Rate ${d}`}
                  className="absolute inset-y-0 right-0 w-1/2"
                  onClick={() => handleClick(d, 'right')}
                />
              </>
            )}
          </div>
        );
      })}
      <span className="ml-2 text-sm text-dim tabular-nums">{value ? value.toFixed(1) : '–'}</span>
    </div>
  );
}

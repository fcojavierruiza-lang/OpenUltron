import { useEffect, useState } from 'react';

function formatNow(d: Date) {
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  const wd = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return { time, date: `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()} ${month}` };
}

/** Clock, date and the U.L.T.R.O.N. wordmark in the top-left corner. */
export function UltronHeader() {
  const [now, setNow] = useState(() => formatNow(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(formatNow(new Date())), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ultron-header pointer-events-none select-none">
      <div className="ultron-clock">
        <span>{now.time}</span>
        <span>{now.date}</span>
      </div>
      <h1 className="ultron-title">U.L.T.R.O.N.</h1>
      <div className="ultron-title-line" />
    </div>
  );
}

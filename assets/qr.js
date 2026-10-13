/* QR encoding is local: qrcode-generator 1.4.4 (MIT), Kazuhiko Arase. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  let current = null;
  const escapeWifi = value => value.replace(/[\\;,:\"]/g, '\\$&');
  function payload() {
    switch ($('kind').value) {
      case 'url': {
        let value = $('url').value.trim();
        if (!value) throw new Error('Pegá el enlace que querés compartir.');
        if (!/^https?:\/\//i.test(value)) {
          if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^[^/:]+:\d+(\/|$)/.test(value)) throw new Error('Usá un enlace web que empiece con https:// o http://.');
          value = 'https://' + value;
        }
        let url;
        try { url = new URL(value); } catch (_) { throw new Error('Revisá el enlace: no parece una dirección web válida.'); }
        if (!url.hostname.includes('.') || url.username || url.password || /\s/.test(value)) throw new Error('Ingresá un enlace web válido, sin espacios ni credenciales.');
        return url.href;
      }
      case 'whatsapp': {
        const raw = $('phone').value.trim();
        const number = raw.replace(/[\s()+-]/g, '');
        if (!/^[1-9]\d{7,14}$/.test(number)) throw new Error('Revisá el número: incluí código de país y entre 8 y 15 dígitos.');
        return 'https://wa.me/' + number + ($('message').value ? '?text=' + encodeURIComponent($('message').value) : '');
      }
      case 'wifi': {
        const ssid = $('ssid').value;
        if (!ssid.trim()) throw new Error('Ingresá el nombre de la red Wi-Fi.');
        if (new TextEncoder().encode(ssid).length > 32) throw new Error('El nombre de la red excede los 32 bytes permitidos por Wi-Fi.');
        const security = $('security').value;
        if (security !== 'nopass' && !$('password').value) throw new Error('Ingresá la contraseña de la red o elegí «Sin contraseña».');
        return 'WIFI:T:' + security + ';S:' + escapeWifi(ssid) + ';' + (security !== 'nopass' ? 'P:' + escapeWifi($('password').value) + ';' : '') + 'H:' + $('hidden-network').checked + ';;';
      }
      default:
        if (!$('text').value.trim()) throw new Error('Escribí el texto que querés compartir.');
        return $('text').value;
    }
  }
  function luminance(hex) {
    const rgb = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  }
  function invalidate() {
    current = null;
    $('download-png').disabled = $('download-svg').disabled = true;
    $('qr-preview').replaceChildren();
    const p = document.createElement('p'); p.className = 'placeholder'; p.textContent = 'Completá los datos y generá tu QR.';
    $('qr-preview').append(p);
    $('status').textContent = 'Generá el QR para aplicar tus datos y colores.';
    $('error').textContent = '';
  }
  $('kind').addEventListener('change', () => {
    ['url', 'whatsapp', 'wifi', 'text'].forEach(type => { $('fields-' + type).hidden = $('kind').value !== type; });
    invalidate();
  });
  $('security').addEventListener('change', () => { $('password').disabled = $('security').value === 'nopass'; });
  $('show-password').addEventListener('change', () => { $('password').type = $('show-password').checked ? 'text' : 'password'; });
  $('qr-form').addEventListener('input', event => { if (event.target.id !== 'show-password') invalidate(); });
  $('qr-form').addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    try {
      const value = payload();
      const foreground = $('foreground').value, background = $('background').value;
      const dark = luminance(foreground), light = luminance(background);
      if (dark >= light || (light + .05) / (dark + .05) < 4.5) throw new Error('Elegí un código más oscuro y un fondo más claro: necesitamos buen contraste para escanearlo.');
      if (new TextEncoder().encode(value).length > 1800) throw new Error('El contenido es demasiado largo. Acortalo para crear un QR fácil de leer.');
      const qr = qrcode(0, 'M'); qr.addData(value, 'Byte'); qr.make();
      const count = qr.getModuleCount(), size = count + 8;
      let path = '';
      for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) if (qr.isDark(y, x)) path += `M${x + 4},${y + 4}h1v1h-1z`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 12}" height="${size * 12}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Código QR generado"><rect width="${size}" height="${size}" fill="${background}"/><path d="${path}" fill="${foreground}"/></svg>`;
      $('qr-preview').innerHTML = svg;
      current = { qr, foreground, background, svg, size };
      $('download-png').disabled = $('download-svg').disabled = false;
      $('status').textContent = '¡Tu QR está listo! Escanealo para comprobar el contenido.';
    } catch (error) {
      $('error').textContent = error instanceof Error ? error.message : 'No pudimos generar el QR. Probá con un contenido más corto.';
      $('status').textContent = 'Revisá los datos para continuar.';
    }
  });
  function download(blob, extension) {
    if (!blob) { $('error').textContent = 'No pudimos crear la descarga. Probá nuevamente.'; return; }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'milsitios-qr.' + extension; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  $('download-svg').addEventListener('click', () => { if (current) download(new Blob([current.svg], { type: 'image/svg+xml;charset=utf-8' }), 'svg'); });
  $('download-png').addEventListener('click', () => {
    if (!current) return;
    const { qr, foreground, background, size } = current;
    const scale = Math.max(8, Math.ceil(1024 / size));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) { $('error').textContent = 'Tu navegador no permite exportar PNG. Probá descargar SVG.'; return; }
    ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = foreground;
    for (let y = 0; y < qr.getModuleCount(); y++) for (let x = 0; x < qr.getModuleCount(); x++) if (qr.isDark(y, x)) ctx.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale);
    canvas.toBlob(blob => download(blob, 'png'), 'image/png');
  });
})();

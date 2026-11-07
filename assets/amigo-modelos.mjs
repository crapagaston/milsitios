export const occasions = { navidad: 'Navidad', familia: 'Familia', amigos: 'Amigos', trabajo: 'Trabajo', otro: 'Otra ocasión' };
export const templates = {
  ideas: { name: 'Ideas para elegir el regalo', subject: 'Una idea para tu regalo · {{nombre_sorteo}}', body: '¡Hola, {{nombre}}!\n\n¿Todavía pensando qué regalar? Prestá atención a sus hobbies, a algo que haya mencionado o a un recuerdo compartido. Un detalle elegido con cariño puede decir mucho.\n\nSi no conocés tanto a esa persona, evitá regalos que requieran saber su talle o gustos muy específicos. Una nota escrita por vos también suma.\n\nPresupuesto: {{presupuesto}}. Nos encontramos el {{fecha}} en {{lugar}}.\n\n¡Guardá el secreto!\n{{organizador}}' },
  semana: { name: 'Falta una semana', subject: 'Se acerca {{nombre_sorteo}}', body: '¡Hola, {{nombre}}!\n\nFalta una semana para nuestro intercambio. Si todavía no elegiste el regalo, es un buen momento para empezar.\n\nNos vemos el {{fecha}} en {{lugar}}. Presupuesto: {{presupuesto}}.\n\nLlevá el regalo envuelto y mantené el misterio hasta el final.\n{{organizador}}' },
  manana: { name: 'Nos vemos mañana', subject: '¡Mañana es nuestro amigo invisible!', body: '¡Hola, {{nombre}}!\n\n¡Mañana nos encontramos! Acordate de llevar tu regalo envuelto, con el nombre de quien lo recibe y sin tu firma.\n\nFecha: {{fecha}}\nLugar: {{lugar}}\n\n¡Nos vemos!\n{{organizador}}' },
  cambios: { name: 'Cambio de planes', subject: 'Actualización de {{nombre_sorteo}}', body: '¡Hola, {{nombre}}!\n\nActualizamos los detalles del encuentro:\n\nFecha: {{fecha}}\nLugar: {{lugar}}\nPresupuesto: {{presupuesto}}\n\nLas asignaciones del sorteo se mantienen.\n{{organizador}}' },
  gracias: { name: 'Gracias por participar', subject: '¡Gracias por compartir {{nombre_sorteo}}!', body: '¡Hola, {{nombre}}!\n\nGracias por participar y por tomarte el tiempo de pensar un regalo para otra persona. Lo más lindo fue compartir el encuentro.\n\n¡Hasta el próximo amigo invisible!\n{{organizador}}' },
  libre: { name: 'Mensaje personalizado', subject: '{{nombre_sorteo}}', body: '¡Hola, {{nombre}}!\n\nEscribí acá tu mensaje.\n\n{{organizador}}' }
};
export function modelFor(key, occasion) {
  const t = { ...templates[key] };
  if (!t.body) throw new Error('Elegí un modelo válido.');
  if (key === 'ideas' && occasion === 'navidad') {
    t.subject = 'Una pista para elegir tu regalo de Navidad 🎄';
    t.body = t.body.replace('¿Todavía pensando qué regalar?', '¡Se acerca Navidad! ¿Todavía pensando qué regalar?');
  }
  if (occasion === 'trabajo' && key === 'ideas') t.body += '\n\nElegí un regalo apropiado para compartir en el trabajo y respetá el presupuesto acordado.';
  return t;
}
export function personalize(text, draw, participant) {
  const values = { nombre: participant.name, nombre_sorteo: draw.title, fecha: draw.date || 'A confirmar', presupuesto: draw.budget || 'A acordar', lugar: draw.place || 'A confirmar', organizador: draw.organizer };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key) => values[key] ?? match);
}

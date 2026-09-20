import { RubiConversationService } from './rubi-conversation.service';

describe('RubiConversationService', () => {
  it('clears the in-memory conversation at the end of a session', () => {
    const service = new RubiConversationService();
    service.add({ author: 'user', text: 'Consulta' });
    service.clear();
    expect(service.messages).toEqual([]);
  });

  it('builds a short provider history without system or welcome messages', () => {
    const service = new RubiConversationService();
    service.add({ author: 'rubi', text: 'Bienvenida' });
    service.add({ author: 'system', text: 'Error local' });
    service.add({ author: 'user', text: 'Quiero inscribirme' });
    service.add({ author: 'rubi', text: 'Usa Inscripciones', intent: 'help', tool: 'search_help', actions: [{ type: 'navigate', destination: 'inscripciones' }] });
    expect(service.recentHistory()).toEqual([
      { role: 'user', text: 'Quiero inscribirme' },
      { role: 'assistant', text: 'Usa Inscripciones', intent: 'help', tool: 'search_help', destination: 'inscripciones' }
    ]);
  });

  it('keeps at most the configured recent turns', () => {
    const service = new RubiConversationService();
    for (let index = 0; index < 8; index++) service.add({ author: 'user', text: `turno ${index}` });
    expect(service.recentHistory(4).map(item => item.text)).toEqual(['turno 4', 'turno 5', 'turno 6', 'turno 7']);
  });

  it('returns the structured state supplied by the Gateway without deriving it from response text', () => {
    const service = new RubiConversationService();
    service.add({ author: 'rubi', text: 'Respuesta sin nombres funcionales', intent: 'help', tool: 'search_help', destination: 'registro', topic: 'documentacion', module: 'registro' });
    expect(service.recentHistory()).toEqual([{
      role: 'assistant', text: 'Respuesta sin nombres funcionales', intent: 'help', tool: 'search_help',
      destination: 'registro', topic: 'documentacion', module: 'registro'
    }]);
  });

  it('expires the session conversation after inactivity', () => {
    let now = 1_000;
    spyOn(Date, 'now').and.callFake(() => now);
    const service = new RubiConversationService();
    service.add({ author: 'user', text: 'Consulta temporal' });
    now += 30 * 60 * 1000 + 1;
    expect(service.messages).toEqual([]);
  });
});

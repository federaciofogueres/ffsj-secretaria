import { RubiConversationService } from './rubi-conversation.service';

describe('RubiConversationService', () => {
  it('clears the in-memory conversation at the end of a session', () => {
    const service = new RubiConversationService();
    service.add({ author: 'user', text: 'Consulta' });
    service.clear();
    expect(service.messages).toEqual([]);
  });
});

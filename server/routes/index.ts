import { eventHandler } from 'h3';
import { useImapFlow } from '../composables/useImapFlow';

export default eventHandler(async () => {
  const imapFlow = useImapFlow();
  const emails = await imapFlow.getEmails();

  return {
    data: emails,
  };
});

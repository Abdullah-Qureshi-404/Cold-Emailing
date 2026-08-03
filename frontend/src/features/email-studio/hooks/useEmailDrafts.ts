import { useQuery } from '@tanstack/react-query';
import { emailsApi } from '../../../services/api/emails';
import { QUERY_KEYS } from '../../../services/api/keys';
import type { EmailDraft } from '../../../types/api';

export function useEmailDrafts(campaignId: number | null) {
  return useQuery<EmailDraft[]>({
    queryKey: QUERY_KEYS.emailDrafts(campaignId),
    queryFn: () => emailsApi.getEmailDrafts(campaignId!),
    enabled: !!campaignId && campaignId > 0,
  });
}

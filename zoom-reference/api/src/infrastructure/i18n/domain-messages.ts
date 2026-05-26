import { invitationsMessages } from '../../modules/invitations/infrastructure/i18n/messages';
import { membersMessages } from '../../modules/members/infrastructure/i18n/messages';
import { pricingMessages } from '../../modules/pricing/infrastructure/i18n/messages';
import { profilesMessages } from '../../modules/profiles/infrastructure/i18n/domain-messages';
import { publicMessages } from '../../modules/public/infrastructure/i18n/domain-messages';
import { recipientsMessages } from '../../modules/recipients/infrastructure/i18n/domain-messages';
import { regionMessages } from '../../modules/region/infrastructure/i18n/domain-messages';
import { roleTemplatesMessages } from '../../modules/role-templates/infrastructure/i18n/messages';
import { usersMessages } from '../../modules/users/infrastructure/i18n/messages';

export const domainMessages = {
	...invitationsMessages,
	...membersMessages,
	...pricingMessages,
	...publicMessages,
	...profilesMessages,
	...recipientsMessages,
	...regionMessages,
	...roleTemplatesMessages,
	...usersMessages,
} as const;

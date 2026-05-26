export interface ToggleFavoriteCommand {
	recipientId: string;
	starred: boolean;
	userId: string;
	permissions: {
		hasShareGuide: boolean;
		hasShareLocker: boolean;
	};
}

export interface ToggleFavoriteResult {
	id: string;
	starred: boolean;
	updatedAt: Date;
}

export abstract class ToggleFavoriteUseCasePort {
	abstract execute(cmd: ToggleFavoriteCommand): Promise<ToggleFavoriteResult>;
}

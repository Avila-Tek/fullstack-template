export interface FieldError {
	field?: string;
	message: string;
	error: string;
}

export interface ApiResponse<T> {
	code: number;
	data: T | null;
	detail?: string;
	error: string | null;
	message: string | null;
	success: boolean;
	errors?: FieldError[];
}

export type Nullable<T> = T | null;

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

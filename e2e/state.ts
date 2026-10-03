/* Shared between global-setup and the spec: who the test owner is and this run's tag. */
export const STATE_FILE = "e2e/.auth/state.json";

export interface SuiteState {
  run: string;
  owner: { email: string; password: string };
  notifyEmail: string;
}

import type { SessionState } from "../../types/quiz";
import type { SessionAction } from "./sessionReducer";

export function getSingleScreenAdvanceActions(state: SessionState): SessionAction[] {
  void state;
  return [{ type: "advance_stage" }];
}

export function getSingleScreenRetreatActions(state: SessionState): SessionAction[] {
  void state;
  return [{ type: "retreat_stage" }];
}

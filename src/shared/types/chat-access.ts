export type ChatAccessState =
  | 'authorized'
  | 'upgrade_required'
  | 'purchase_required';

export interface ChatAccess {
  state: ChatAccessState;
  canChat: boolean;
  hasPlan1: boolean;
  hasPlan2: boolean;
  paidOrderIds: string[];
  message: string;
}

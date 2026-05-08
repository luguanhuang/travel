import {
  CHAT_MODEL,
  CHAT_REQUIRED_PRODUCT_ID,
  CHAT_UPGRADE_PRODUCT_ID,
} from '@/shared/constants/chat';
import { OrderStatus, getOrders } from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';

export const CHAT_SYSTEM_PROMPT = `你是一个中国旅游规划大师，专门帮助来中国旅游的海外游客解决问题。

你只能回答与中国旅游相关的问题，包括但不限于：
- 中国城市旅行规划
- 景点、交通、高铁、地铁、打车
- 酒店、住宿区域建议
- 中国支付方式，如 Alipay、WeChat Pay
- 中国常用 App、SIM 卡、网络、地图、翻译
- 签证、入境、旅行准备
- 旅行礼仪、安全、饮食、购物、退税

如果用户的问题与中国旅游无关，你要礼貌拒绝，并引导用户提出与中国旅游相关的问题。

回答要求：
- 优先给出实用、可执行、面向海外游客的建议
- 表达清晰，结构化，必要时使用 markdown 列表
- 不要编造不确定的信息；不确定时明确说明前提或建议用户二次确认
- 默认使用用户提问的语言回答`;

export type ChatAccessState =
  | 'authorized'
  | 'upgrade_required'
  | 'purchase_required';

export interface ChatAccessResult {
  state: ChatAccessState;
  canChat: boolean;
  hasPlan1: boolean;
  hasPlan2: boolean;
  paidOrderIds: string[];
}

export async function getChatAccessForCurrentUser(): Promise<ChatAccessResult | null> {
  const user = await getUserInfo();
  if (!user) {
    return null;
  }

  const paidOrders = await getOrders({
    userId: user.id,
    status: OrderStatus.PAID,
    limit: 100,
  });

  const hasPlan2 = paidOrders.some(
    (item) => item.productId === CHAT_REQUIRED_PRODUCT_ID
  );
  const hasPlan1 = paidOrders.some(
    (item) => item.productId === CHAT_UPGRADE_PRODUCT_ID
  );

  const state: ChatAccessState = hasPlan2
    ? 'authorized'
    : hasPlan1
      ? 'upgrade_required'
      : 'purchase_required';

  return {
    state,
    canChat: hasPlan2,
    hasPlan1,
    hasPlan2,
    paidOrderIds: paidOrders.map((item) => item.id),
  };
}

export function getChatAccessErrorMessage(access: ChatAccessResult | null) {
  if (!access) {
    return 'no auth, please sign in';
  }

  switch (access.state) {
    case 'authorized':
      return '';
    case 'upgrade_required':
      return 'upgrade required: buy Plan 2 to chat with the AI guide';
    case 'purchase_required':
    default:
      return 'purchase required: buy a plan to access the AI guide';
  }
}

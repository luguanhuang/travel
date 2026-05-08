import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  getChatAccessErrorMessage,
  getChatAccessForCurrentUser,
} from '@/shared/services/chat-access';

export async function POST() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const access = await getChatAccessForCurrentUser();
    if (!access) {
      return respErr('no auth, please sign in');
    }

    return respData({
      ...access,
      message: getChatAccessErrorMessage(access),
    });
  } catch (e: any) {
    console.log('get chat access failed:', e);
    return respErr(`get chat access failed: ${e.message}`);
  }
}
